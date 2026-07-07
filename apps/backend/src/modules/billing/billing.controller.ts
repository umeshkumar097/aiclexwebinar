import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  RawBodyRequest,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ── Stripe Webhook (no auth — Stripe sends this) ───────────────────────────
  // IMPORTANT: This endpoint MUST receive the raw body for signature verification
  @Post('webhook/stripe')
  @HttpCode(200)
  async stripeWebhook(
    @Req() req: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = (req.rawBody as Buffer | undefined) ?? Buffer.from('');
    return this.billingService.handleWebhook(rawBody, signature);
  }

  // ── Get current org billing info ────────────────────────────────────────────
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMyBilling(@CurrentUser() user: AuthenticatedUser) {
    const orgId = user.orgId ?? '';
    return this.billingService.getOrgBilling(orgId);
  }

  // ── Create Stripe Checkout session (upgrade plan) ───────────────────────────
  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { priceId: string; successUrl?: string; cancelUrl?: string },
  ) {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'https://webinar.zonvo.tech';
    return this.billingService.createCheckoutSession(
      user.orgId ?? '',
      body.priceId,
      body.successUrl ?? `${frontendUrl}/dashboard/billing?success=1`,
      body.cancelUrl  ?? `${frontendUrl}/dashboard/billing?cancelled=1`,
    );
  }

  // ── Create Stripe Customer Portal session (manage/cancel subscription) ──────
  @Post('portal')
  @UseGuards(JwtAuthGuard)
  async createPortal(@CurrentUser() user: AuthenticatedUser) {
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'https://webinar.zonvo.tech';
    return this.billingService.createPortalSession(
      user.orgId ?? '',
      `${frontendUrl}/dashboard/billing`,
    );
  }
}
