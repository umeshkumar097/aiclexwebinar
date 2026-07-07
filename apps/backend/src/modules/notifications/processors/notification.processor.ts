import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

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

    // Increment attempt count
    await this.notificationRepository.increment({ id: notificationId }, 'attempts', 1);

    try {
      if (type === 'email' || job.name === JOB_NAMES.SEND_EMAIL) {
        await this.sendEmail(to, templateKey, variables);
      } else if (type === 'whatsapp' || job.name === JOB_NAMES.SEND_WHATSAPP) {
        await this.sendWhatsApp(to, templateKey, variables);
      } else {
        // in_app — just mark as sent (already stored in DB)
      }

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

      // Re-throw so BullMQ can handle retry/DLQ logic
      throw error;
    }
  }

  private async sendEmail(
    to: string,
    templateKey: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const fromEmail = this.configService.get('email.fromEmail', { infer: true });
    const fromName = this.configService.get('email.fromName', { infer: true });
    const smtpHost = this.configService.get('email.smtpHost', { infer: true });

    const { subject, html } = this.renderEmailTemplate(templateKey, variables);

    // Use SMTP (nodemailer) if host is configured; fall back to Resend
    if (smtpHost) {
      const smtpPort = this.configService.get('email.smtpPort', { infer: true });
      const smtpUser = this.configService.get('email.smtpUser', { infer: true });
      const smtpPassword = this.configService.get('email.smtpPassword', { infer: true });
      const smtpSecure = this.configService.get('email.smtpSecure', { infer: true });

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure, // true → SSL (port 465), false → STARTTLS (port 587)
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });

      await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        html,
      });
    } else {
      // Fallback: Resend API
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
    // Template rendering — in production this would use React Email templates
    // For Phase 1, we use simple string interpolation
    const templates: Record<string, { subject: string; body: string }> = {
      'auth.verify_email': {
        subject: 'Verify your email address',
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 16px;">Hi ${variables['firstName'] ?? 'there'},</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              Please verify your email address to activate your account.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['verifyLink'] ?? '#'}" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This link expires in 24 hours. If you did not create an account, you can safely ignore this email.</p>
          </div>
        `,
      },
      'auth.reset_password': {
        subject: 'Reset your password',
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 16px;">Hi ${variables['firstName'] ?? 'there'},</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              We received a request to reset your password. Click the button below to set a new password.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['resetLink'] ?? '#'}" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This link expires in ${variables['expiryHours'] ?? '1'} hour. If you did not request this, please ignore this email and your password will remain unchanged.</p>
          </div>
        `,
      },
      'member.invited': {
        subject: `You've been invited to join ${variables['orgName'] ?? 'an organization'}`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 16px;">You have been invited!</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              <strong>${variables['inviterName'] ?? 'Someone'}</strong> has invited you to join <strong>${variables['orgName'] ?? 'their organization'}</strong> as a <strong>${variables['role'] ?? 'member'}</strong>.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['acceptLink'] ?? '#'}" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This invitation expires in 24 hours.</p>
          </div>
        `,
      },

      // ── Webinar Templates ────────────────────────────────────────────────────

      'webinar.registration_confirmed': {
        subject: `You are registered for ${variables['webinarTitle'] ?? 'the webinar'}`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #8b5cf6; border-radius: 12px; padding: 24px; margin-bottom: 28px;">
              <p style="color: #8b5cf6; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px;">Registration Confirmed ✓</p>
              <h2 style="font-size: 22px; margin: 0 0 16px; color: #fff;">${variables['webinarTitle'] ?? 'Webinar'}</h2>
              <p style="color: #a1a1aa; margin: 4px 0;">📅 <strong style="color:#fff;">${variables['webinarDate'] ?? 'TBD'}</strong></p>
              <p style="color: #a1a1aa; margin: 4px 0;">🕐 <strong style="color:#fff;">${variables['webinarTime'] ?? 'TBD'}</strong></p>
              <p style="color: #a1a1aa; margin: 4px 0;">🎙️ Hosted by <strong style="color:#fff;">${variables['hostName'] ?? 'The Host'}</strong></p>
            </div>
            <h3 style="font-size: 18px; margin-bottom: 12px;">Hi ${variables['firstName'] ?? 'there'},</h3>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              You are officially registered! We are excited to have you join us. Save the details above and use the button below to join when the webinar starts.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['joinLink'] ?? '#'}" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block; letter-spacing: 0.5px;">
                Join Webinar →
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; text-align: center;">You will also receive reminder emails before the webinar starts.</p>
          </div>
        `,
      },

      'webinar.reminder_24h': {
        subject: `Your webinar starts in 24 hours: ${variables['webinarTitle'] ?? 'Webinar'}`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <div style="background: #1a1a2e; border-left: 4px solid #8b5cf6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin-bottom: 28px;">
              <p style="color: #8b5cf6; font-size: 13px; margin: 0 0 4px; font-weight: 600;">⏰ REMINDER — 24 HOURS TO GO</p>
              <p style="font-size: 18px; margin: 0; font-weight: 700;">${variables['webinarTitle'] ?? 'Webinar'}</p>
            </div>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">Hi ${variables['firstName'] ?? 'there'}, your webinar starts tomorrow!</p>
            <p style="color: #a1a1aa; margin: 6px 0;">📅 <strong style="color:#fff;">${variables['webinarDate'] ?? 'TBD'}</strong></p>
            <p style="color: #a1a1aa; margin: 6px 0 24px;">🕐 <strong style="color:#fff;">${variables['webinarTime'] ?? 'TBD'}</strong></p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['joinLink'] ?? '#'}" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 14px 36px; border-radius: 8px; text-decoration: none; font-weight: 700; display: inline-block;">
                Join Tomorrow →
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; text-align: center;">Hosted by ${variables['hostName'] ?? 'the host'}</p>
          </div>
        `,
      },

      'webinar.reminder_1h': {
        subject: `Your webinar starts in 1 hour: ${variables['webinarTitle'] ?? 'Webinar'}`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <div style="background: linear-gradient(135deg, #1a1a2e, #16213e); border: 1px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
              <p style="color: #f59e0b; font-size: 36px; margin: 0 0 4px;">⏱️</p>
              <p style="color: #f59e0b; font-weight: 700; font-size: 15px; margin: 0;">STARTING IN 1 HOUR</p>
            </div>
            <h2 style="font-size: 20px; margin-bottom: 12px;">${variables['webinarTitle'] ?? 'Webinar'}</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 16px;">Hi ${variables['firstName'] ?? 'there'}, your webinar is almost here! Make sure you are ready to join.</p>
            <p style="color: #a1a1aa; margin: 6px 0;">🕐 <strong style="color:#fff;">Starts at ${variables['webinarTime'] ?? 'TBD'}</strong> on ${variables['webinarDate'] ?? 'TBD'}</p>
            <div style="text-align: center; margin: 28px 0;">
              <a href="${variables['joinLink'] ?? '#'}" style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; padding: 16px 44px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
                Get Ready →
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; text-align: center;">Hosted by ${variables['hostName'] ?? 'the host'}</p>
          </div>
        `,
      },

      'webinar.reminder_15m': {
        subject: `${variables['webinarTitle'] ?? 'Your webinar'} is starting in 15 minutes!`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <div style="background: linear-gradient(135deg, #450a0a, #7f1d1d); border: 1px solid #ef4444; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
              <p style="color: #fca5a5; font-size: 42px; margin: 0;">🚨</p>
              <p style="color: #ef4444; font-weight: 800; font-size: 18px; margin: 8px 0 0; letter-spacing: 1px;">15 MINUTES LEFT!</p>
            </div>
            <h2 style="font-size: 20px; margin-bottom: 12px;">${variables['webinarTitle'] ?? 'Webinar'}</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 20px;">Hi ${variables['firstName'] ?? 'there'}, your webinar starts in just 15 minutes. Click below to join now!</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${variables['joinLink'] ?? '#'}" style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; padding: 18px 52px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 18px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 24px rgba(239,68,68,0.4);">
                🔴 JOIN NOW
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; text-align: center; margin-top: 20px;">Hosted by ${variables['hostName'] ?? 'the host'}</p>
          </div>
        `,
      },

      'webinar.started': {
        subject: `${variables['webinarTitle'] ?? 'Your webinar'} is LIVE now!`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Aiclex Webinar</h1>
            </div>
            <div style="background: linear-gradient(135deg, #022c22, #064e3b); border: 1px solid #10b981; border-radius: 12px; padding: 20px; margin-bottom: 28px; text-align: center;">
              <span style="background: #10b981; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; letter-spacing: 2px; display: inline-block; margin-bottom: 10px;">● LIVE</span>
              <h2 style="font-size: 22px; margin: 0; color: #fff;">${variables['webinarTitle'] ?? 'Webinar'}</h2>
            </div>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">Hi ${variables['firstName'] ?? 'there'}, the webinar you registered for has just started! Join now before you miss anything.</p>
            <div style="text-align: center; margin: 24px 0;">
              <a href="${variables['joinLink'] ?? '#'}" style="background: linear-gradient(135deg, #10b981, #059669); color: white; padding: 18px 52px; border-radius: 10px; text-decoration: none; font-weight: 800; font-size: 18px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 4px 24px rgba(16,185,129,0.4);">
                🎙️ JOIN LIVE NOW
              </a>
            </div>
            <p style="color: #71717a; font-size: 13px; text-align: center; margin-top: 20px;">Hosted by ${variables['hostName'] ?? 'the host'}</p>
          </div>
        `,
      },
    };

    const template = templates[templateKey];
    if (!template) {
      return {
        subject: 'Notification from Aiclex Webinar',
        html: `<p>You have a new notification from Aiclex Webinar.</p>`,
      };
    }

    return { subject: template.subject, html: template.body };
  }
}
