import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

import { JOB_NAMES, QUEUE_NAMES } from '@zonvo/constants';

import type { AppConfig } from '../../../config/configuration';
import {
  Notification,
  NotificationStatus,
} from '../entities/notification.entity';

interface NotificationJobData {
  notificationId: string;
  to: string;
  templateKey: string;
  variables: Record<string, string>;
  type: 'email' | 'whatsapp' | 'in_app';
}

@Processor(QUEUE_NAMES.NOTIFICATIONS)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {
    super();
  }

  async process(job: Job<NotificationJobData>): Promise<void> {
    const { notificationId, to, templateKey, variables, type } = job.data;

    await this.notificationRepository.increment({ id: notificationId }, 'attempts', 1);

    try {
      if (type === 'email' || job.name === JOB_NAMES.SEND_EMAIL) {
        await this.sendEmail(to, templateKey, variables);
      } else if (type === 'whatsapp' || job.name === JOB_NAMES.SEND_WHATSAPP) {
        await this.sendWhatsApp(to, templateKey, variables);
      }
      // in_app — stored in DB, no external delivery needed

      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.SENT,
        sentAt: new Date(),
      });

      this.logger.log(`Notification ${notificationId} sent (${type}: ${templateKey})`);
    } catch (error) {
      this.logger.error(
        `Failed to send notification ${notificationId} (attempt ${job.attemptsMade}):`,
        error,
      );

      await this.notificationRepository.update(notificationId, {
        status: NotificationStatus.FAILED,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  private async sendEmail(
    to: string,
    templateKey: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const smtpHost = this.configService.get('email.smtpHost' as never, { infer: true }) as string | undefined;
    const smtpPort = this.configService.get('email.smtpPort' as never, { infer: true }) as number | undefined;
    const smtpUser = this.configService.get('email.smtpUser' as never, { infer: true }) as string | undefined;
    const smtpPassword = this.configService.get('email.smtpPassword' as never, { infer: true }) as string | undefined;
    const smtpSecure = this.configService.get('email.smtpSecure' as never, { infer: true }) as boolean | undefined;
    const fromEmail = this.configService.get('email.fromEmail', { infer: true });
    const fromName = this.configService.get('email.fromName', { infer: true });

    const { subject, html } = this.renderEmailTemplate(templateKey, variables);

    // Use SMTP if configured
    if (smtpHost && smtpUser && smtpPassword) {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort ?? 465,
        secure: smtpSecure !== false, // true for port 465
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
        tls: { rejectUnauthorized: false },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });

      this.logger.log(`SMTP email sent to ${to}: ${templateKey}`);
      return;
    }

    // Fallback to Resend if no SMTP configured
    const { Resend } = await import('resend');
    const apiKey = this.configService.get('email.apiKey', { infer: true });
    const resend = new Resend(apiKey);

    const { error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      subject,
      html,
    });

    if (error) {
      throw new Error(`Resend API error: ${JSON.stringify(error)}`);
    }
  }

  private async sendWhatsApp(
    to: string,
    templateKey: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const accessToken = this.configService.get('whatsapp.accessToken', { infer: true });
    const phoneNumberId = this.configService.get('whatsapp.phoneNumberId', { infer: true });
    const apiVersion = this.configService.get('whatsapp.apiVersion', { infer: true });

    const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'template',
        template: {
          name: templateKey.replace(/\./g, '_'),
          language: { code: 'en_US' },
          components: [
            {
              type: 'body',
              parameters: Object.values(variables).map((value) => ({
                type: 'text',
                text: value,
              })),
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Meta WhatsApp API error (${response.status}): ${errorBody}`);
    }
  }

  private renderEmailTemplate(
    templateKey: string,
    variables: Record<string, string>,
  ): { subject: string; html: string } {
    const v = variables;

    const brandHeader = `
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#8b5cf6;font-size:26px;margin:0;letter-spacing:-0.5px;">Aiclex Webinar</h1>
      </div>
    `;
    const footer = `
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #27272a;text-align:center;">
        <p style="color:#52525b;font-size:12px;margin:0;">© 2025 Aiclex Webinar &nbsp;|&nbsp; <a href="https://webinar.zonvo.tech" style="color:#8b5cf6;text-decoration:none;">webinar.zonvo.tech</a></p>
      </div>
    `;
    const wrap = (body: string) => `
      <div style="font-family:'Inter',Arial,sans-serif;max-width:600px;margin:0 auto;background:#0f0f0f;color:#ffffff;padding:40px 32px;border-radius:16px;border:1px solid #27272a;">
        ${brandHeader}${body}${footer}
      </div>
    `;
    const btn = (label: string, href: string, color = '#8b5cf6') => `
      <div style="text-align:center;margin:28px 0;">
        <a href="${href}" style="background:${color};color:#fff;padding:14px 36px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">${label}</a>
      </div>
    `;
    const info = (label: string, value: string) => `
      <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #27272a;">
        <span style="color:#71717a;font-size:14px;">${label}</span>
        <span style="color:#fff;font-size:14px;font-weight:600;">${value}</span>
      </div>
    `;

    const templates: Record<string, { subject: string; body: string }> = {
      'auth.verify_email': {
        subject: 'Verify your email address',
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">Hi ${v['firstName'] ?? 'there'}, 👋</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;">Please verify your email address to activate your account.</p>
          ${btn('Verify Email Address', v['verifyLink'] ?? '#')}
          <p style="color:#71717a;font-size:13px;text-align:center;">Link expires in 24 hours.</p>
        `),
      },
      'auth.reset_password': {
        subject: 'Reset your password',
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">Hi ${v['firstName'] ?? 'there'},</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;">We received a request to reset your password.</p>
          ${btn('Reset Password', v['resetLink'] ?? '#')}
          <p style="color:#71717a;font-size:13px;text-align:center;">Expires in ${v['expiryHours'] ?? '1'} hour. If you didn't request this, ignore this email.</p>
        `),
      },
      'member.invited': {
        subject: `You've been invited to join ${v['orgName'] ?? 'an organization'}`,
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">You have been invited! 🎉</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;">
            <strong>${v['inviterName'] ?? 'Someone'}</strong> invited you to join <strong>${v['orgName'] ?? 'an organization'}</strong> as <strong>${v['role'] ?? 'member'}</strong>.
          </p>
          ${btn('Accept Invitation', v['acceptLink'] ?? '#')}
          <p style="color:#71717a;font-size:13px;text-align:center;">Invitation expires in 24 hours.</p>
        `),
      },

      // ── Webinar templates ─────────────────────────────────────────────────
      'webinar.registration_confirmed': {
        subject: `✅ You're registered for "${v['webinarTitle'] ?? 'the webinar'}"`,
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">You're all set, ${v['firstName'] ?? 'there'}! 🎉</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;">Your registration has been confirmed. Here are your webinar details:</p>
          <div style="background:#18181b;border-radius:12px;padding:20px;margin-bottom:20px;">
            ${info('Webinar', v['webinarTitle'] ?? '')}
            ${info('Date', v['webinarDate'] ?? '')}
            ${info('Time', v['webinarTime'] ?? '')}
            ${info('Host', v['hostName'] ?? '')}
          </div>
          ${btn('Join Webinar', v['joinLink'] ?? '#', '#8b5cf6')}
          <p style="color:#71717a;font-size:13px;text-align:center;">Add to your calendar so you don't miss it!</p>
        `),
      },
      'webinar.reminder_24h': {
        subject: `⏰ Reminder: "${v['webinarTitle'] ?? 'Webinar'}" starts in 24 hours`,
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">See you tomorrow, ${v['firstName'] ?? 'there'}!</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;">Your upcoming webinar is just 24 hours away. Don't forget to join!</p>
          <div style="background:#18181b;border-radius:12px;padding:20px;margin-bottom:20px;">
            ${info('Webinar', v['webinarTitle'] ?? '')}
            ${info('Date', v['webinarDate'] ?? '')}
            ${info('Time', v['webinarTime'] ?? '')}
          </div>
          ${btn('Join Webinar', v['joinLink'] ?? '#', '#8b5cf6')}
        `),
      },
      'webinar.reminder_1h': {
        subject: `🔔 "${v['webinarTitle'] ?? 'Webinar'}" starts in 1 hour!`,
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">Starting soon, ${v['firstName'] ?? 'there'}!</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;"><strong style="color:#fff;">${v['webinarTitle'] ?? 'Your webinar'}</strong> starts in just 1 hour. Get ready to join!</p>
          <div style="background:#18181b;border-radius:12px;padding:20px;margin-bottom:20px;">
            ${info('Time', v['webinarTime'] ?? '')}
            ${info('Host', v['hostName'] ?? '')}
          </div>
          ${btn('Join Now', v['joinLink'] ?? '#', '#7c3aed')}
        `),
      },
      'webinar.reminder_15m': {
        subject: `🚨 "${v['webinarTitle'] ?? 'Webinar'}" starts in 15 minutes!`,
        body: wrap(`
          <h2 style="font-size:22px;margin-bottom:12px;">Almost time, ${v['firstName'] ?? 'there'}! ⚡</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;"><strong style="color:#fff;">${v['webinarTitle'] ?? 'Your webinar'}</strong> is starting in <strong style="color:#f59e0b;">15 minutes</strong>. Click below to join!</p>
          ${btn('🚀 Join Now', v['joinLink'] ?? '#', '#dc2626')}
          <p style="color:#71717a;font-size:13px;text-align:center;">Make sure your browser is ready and volume is on.</p>
        `),
      },
      'webinar.started': {
        subject: `🔴 LIVE NOW: "${v['webinarTitle'] ?? 'Webinar'}" has started!`,
        body: wrap(`
          <div style="text-align:center;margin-bottom:20px;">
            <div style="display:inline-flex;align-items:center;gap:8px;background:#dc2626;padding:8px 20px;border-radius:999px;">
              <span style="width:8px;height:8px;background:#fff;border-radius:50%;display:inline-block;"></span>
              <span style="color:#fff;font-weight:700;font-size:14px;letter-spacing:0.05em;">LIVE NOW</span>
            </div>
          </div>
          <h2 style="font-size:22px;margin-bottom:12px;text-align:center;">${v['webinarTitle'] ?? 'Your webinar'} is live!</h2>
          <p style="color:#a1a1aa;line-height:1.7;margin-bottom:20px;text-align:center;">Hi ${v['firstName'] ?? 'there'} — the session has just started. Join now!</p>
          ${btn('🔴 Join Live Now', v['joinLink'] ?? '#', '#dc2626')}
        `),
      },
    };

    const template = templates[templateKey];
    if (!template) {
      return {
        subject: 'Notification from Aiclex Webinar',
        html: wrap(`<p style="color:#a1a1aa;">You have a new notification.</p>`),
      };
    }

    return { subject: template.subject, html: template.body };
  }
}
