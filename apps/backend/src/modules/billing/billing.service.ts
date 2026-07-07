import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';

import { Subscription, SubscriptionStatus, PlanType } from './entities/subscription.entity';
import { Invoice, InvoiceStatus } from './entities/invoice.entity';
import { Organization, OrgStatus } from '../organizations/entities/organization.entity';

// Map Stripe price IDs → plan types — set real Price IDs from Stripe Dashboard
const PRICE_TO_PLAN: Record<string, PlanType> = {
  // Add your real Stripe Price IDs here, e.g.:
  // price_pro_monthly: PlanType.PRO,
  // price_business_monthly: PlanType.BUSINESS,
};

function stripeToPlan(priceId: string | null | undefined): PlanType {
  if (!priceId) return PlanType.FREE;
  return PRICE_TO_PLAN[priceId] ?? PlanType.FREE;
}

function stripeStatusToLocal(status: string): SubscriptionStatus {
  const m: Record<string, SubscriptionStatus> = {
    trialing:           SubscriptionStatus.TRIALING,
    active:             SubscriptionStatus.ACTIVE,
    past_due:           SubscriptionStatus.PAST_DUE,
    canceled:           SubscriptionStatus.CANCELLED,
    unpaid:             SubscriptionStatus.UNPAID,
    incomplete:         SubscriptionStatus.INCOMPLETE,
    incomplete_expired: SubscriptionStatus.CANCELLED,
  };
  return m[status] ?? SubscriptionStatus.INCOMPLETE;
}

function isActive(s: SubscriptionStatus): boolean {
  return s === SubscriptionStatus.ACTIVE || s === SubscriptionStatus.TRIALING;
}

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);
  private readonly stripe: Stripe;

  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Invoice)
    private readonly invRepo: Repository<Invoice>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {
    this.stripe = new Stripe(process.env['STRIPE_SECRET_KEY'] ?? '', {
      apiVersion: '2026-06-24.dahlia' as any,
    });
  }

  // ─── Webhook (raw body + stripe-signature header) ────────────────────────────
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: boolean }> {
    const secret = process.env['STRIPE_WEBHOOK_SECRET'] ?? '';
    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    this.logger.log(`Stripe event: ${event.type}`);

    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          await this.onSubscriptionUpsert(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await this.onInvoicePaid(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await this.onInvoiceFailed(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.created':
        case 'invoice.updated':
        case 'invoice.finalized':
          await this.upsertInvoice(event.data.object as Stripe.Invoice);
          break;
        case 'checkout.session.completed':
          await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        default:
          this.logger.debug(`Unhandled event: ${event.type}`);
      }
    } catch (err) {
      this.logger.error(`Error in event ${event.type}`, err);
    }

    return { received: true };
  }

  // ─── Subscription created / updated ─────────────────────────────────────────
  private async onSubscriptionUpsert(s: Stripe.Subscription): Promise<void> {
    const customerId = typeof s.customer === 'string' ? s.customer : s.customer.id;

    let sub = await this.subRepo.findOne({ where: { stripeSubscriptionId: s.id } })
           ?? await this.subRepo.findOne({ where: { stripeCustomerId: customerId } });

    if (!sub) {
      this.logger.warn(`No org found for customer=${customerId} sub=${s.id}`);
      return;
    }

    const priceId = s.items.data[0]?.price?.id ?? null;
    const newStatus = stripeStatusToLocal(s.status);

    sub.stripeSubscriptionId = s.id;
    sub.stripePriceId        = priceId;
    sub.status               = newStatus;
    sub.planType             = stripeToPlan(priceId);
    sub.cancelAtPeriodEnd    = s.cancel_at_period_end;
    sub.currentPeriodStart   = new Date(((s as any).current_period_start ?? 0) * 1000);
    sub.currentPeriodEnd     = new Date(((s as any).current_period_end ?? 0) * 1000);
    sub.trialEnd             = s.trial_end ? new Date(s.trial_end * 1000) : null;

    await this.subRepo.save(sub);
    await this.syncOrg(sub.orgId, newStatus);
    this.logger.log(`Sub ${s.id} → org ${sub.orgId}: ${newStatus} (${sub.planType})`);
  }

  // ─── Subscription deleted ────────────────────────────────────────────────────
  private async onSubscriptionDeleted(s: Stripe.Subscription): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { stripeSubscriptionId: s.id } });
    if (!sub) return;

    sub.status      = SubscriptionStatus.CANCELLED;
    sub.planType    = PlanType.FREE;
    sub.cancelledAt = new Date();
    await this.subRepo.save(sub);
    await this.syncOrg(sub.orgId, SubscriptionStatus.CANCELLED);
    this.logger.log(`Sub ${s.id} CANCELLED → org ${sub.orgId} downgraded to FREE`);
  }

  // ─── Invoice paid ────────────────────────────────────────────────────────────
  private async onInvoicePaid(inv: Stripe.Invoice): Promise<void> {
    await this.upsertInvoice(inv, InvoiceStatus.PAID);

    // Re-activate if was past_due
    const invSub = (inv as any).subscription;
    const stripeSubId = typeof invSub === 'string' ? invSub : (invSub as Stripe.Subscription | null)?.id ?? null;

    if (stripeSubId) {
      const sub = await this.subRepo.findOne({ where: { stripeSubscriptionId: stripeSubId } });
      if (sub && sub.status === SubscriptionStatus.PAST_DUE) {
        sub.status = SubscriptionStatus.ACTIVE;
        await this.subRepo.save(sub);
        await this.syncOrg(sub.orgId, SubscriptionStatus.ACTIVE);
        this.logger.log(`Payment recovered → org ${sub.orgId} ACTIVE`);
      }
    }
  }

  // ─── Invoice failed ──────────────────────────────────────────────────────────
  private async onInvoiceFailed(inv: Stripe.Invoice): Promise<void> {
    await this.upsertInvoice(inv);
    this.logger.warn(`Invoice FAILED: ${inv.id}`);
  }

  // ─── Checkout completed ──────────────────────────────────────────────────────
  private async onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    const orgId = session.metadata?.['orgId'];
    if (!orgId) return;

    const customerId = typeof session.customer === 'string'
      ? session.customer
      : (session.customer as Stripe.Customer | null)?.id ?? null;
    if (!customerId) return;

    let sub = await this.subRepo.findOne({ where: { orgId } })
           ?? this.subRepo.create({ orgId });

    sub.stripeCustomerId = customerId;

    if (session.subscription) {
      const subId = typeof session.subscription === 'string'
        ? session.subscription
        : (session.subscription as Stripe.Subscription).id;
      const stripeSub = await this.stripe.subscriptions.retrieve(subId);
      const priceId = stripeSub.items.data[0]?.price?.id ?? null;
      sub.stripeSubscriptionId = subId;
      sub.stripePriceId        = priceId;
      sub.status               = stripeStatusToLocal(stripeSub.status);
      sub.planType             = stripeToPlan(priceId);
      sub.currentPeriodStart   = new Date(((stripeSub as any).current_period_start ?? 0) * 1000);
      sub.currentPeriodEnd     = new Date(((stripeSub as any).current_period_end ?? 0) * 1000);
    }

    await this.subRepo.save(sub);
    await this.syncOrg(orgId, sub.status);
    this.logger.log(`Checkout done → org ${orgId} (${sub.planType})`);
  }

  // ─── Sync org active/suspended ───────────────────────────────────────────────
  private async syncOrg(orgId: string, status: SubscriptionStatus): Promise<void> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) return;
    const newStatus = isActive(status) ? OrgStatus.ACTIVE : OrgStatus.SUSPENDED;
    if (org.status !== newStatus) {
      await this.orgRepo.update(orgId, { status: newStatus });
      this.logger.log(`Org ${orgId} → ${newStatus}`);
    }
  }

  // ─── Upsert invoice ──────────────────────────────────────────────────────────
  private async upsertInvoice(
    inv: Stripe.Invoice,
    forceStatus?: InvoiceStatus,
  ): Promise<void> {
    const customerId = typeof inv.customer === 'string'
      ? inv.customer
      : (inv.customer as Stripe.Customer | null)?.id ?? null;

    const sub = customerId
      ? await this.subRepo.findOne({ where: { stripeCustomerId: customerId } })
      : null;
    if (!sub) return;

    const existing = await this.invRepo.findOne({ where: { stripeInvoiceId: inv.id } })
                  ?? this.invRepo.create({ orgId: sub.orgId });

    const statusMap: Record<string, InvoiceStatus> = {
      draft: InvoiceStatus.DRAFT, open: InvoiceStatus.OPEN,
      paid: InvoiceStatus.PAID, uncollectible: InvoiceStatus.UNCOLLECTIBLE,
      void: InvoiceStatus.VOID,
    };

    existing.stripeInvoiceId  = inv.id;
    existing.stripeCustomerId = customerId;
    existing.amountPaid       = inv.amount_paid;
    existing.amountDue        = inv.amount_due;
    existing.currency         = inv.currency.toUpperCase();
    existing.status           = forceStatus ?? statusMap[inv.status ?? 'draft'] ?? InvoiceStatus.DRAFT;
    existing.invoicePdf       = inv.invoice_pdf ?? null;
    existing.hostedInvoiceUrl = inv.hosted_invoice_url ?? null;
    existing.paidAt           = inv.status_transitions?.paid_at
      ? new Date(inv.status_transitions.paid_at * 1000) : null;
    existing.periodStart      = inv.period_start ? new Date(inv.period_start * 1000) : null;
    existing.periodEnd        = inv.period_end   ? new Date(inv.period_end * 1000)   : null;

    await this.invRepo.save(existing);
  }

  // ─── Create Checkout Session ─────────────────────────────────────────────────
  async createCheckoutSession(
    orgId: string,
    priceId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ url: string }> {
    let sub = await this.subRepo.findOne({ where: { orgId } });

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { orgId },
    };

    if (sub?.stripeCustomerId) params.customer = sub.stripeCustomerId;

    const session = await this.stripe.checkout.sessions.create(params);

    if (session.customer && !sub?.stripeCustomerId) {
      if (!sub) sub = this.subRepo.create({ orgId });
      sub.stripeCustomerId = typeof session.customer === 'string'
        ? session.customer : (session.customer as Stripe.Customer).id;
      await this.subRepo.save(sub);
    }

    return { url: session.url! };
  }

  // ─── Customer Portal ─────────────────────────────────────────────────────────
  async createPortalSession(orgId: string, returnUrl: string): Promise<{ url: string }> {
    const sub = await this.subRepo.findOne({ where: { orgId } });
    if (!sub?.stripeCustomerId) throw new BadRequestException('No Stripe customer found');

    const portal = await this.stripe.billingPortal.sessions.create({
      customer: sub.stripeCustomerId,
      return_url: returnUrl,
    });
    return { url: portal.url };
  }

  // ─── Get billing info ────────────────────────────────────────────────────────
  async getOrgBilling(orgId: string): Promise<{ subscription: Subscription | null; invoices: Invoice[] }> {
    const [subscription, invoices] = await Promise.all([
      this.subRepo.findOne({ where: { orgId } }),
      this.invRepo.find({ where: { orgId }, order: { createdAt: 'DESC' }, take: 20 }),
    ]);
    return { subscription, invoices };
  }
}
