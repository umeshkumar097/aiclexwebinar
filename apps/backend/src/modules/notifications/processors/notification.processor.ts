import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
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
    const apiKey = this.configService.get('email.apiKey', { infer: true });
    const fromEmail = this.configService.get('email.fromEmail', { infer: true });
    const fromName = this.configService.get('email.fromName', { infer: true });

    const resend = new Resend(apiKey);

    const { subject, html } = this.renderEmailTemplate(templateKey, variables);

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
    // Template rendering — in production this would use React Email templates
    // For Phase 1, we use simple string interpolation
    const templates: Record<string, { subject: string; body: string }> = {
      'auth.verify_email': {
        subject: 'Verify your Zonvo email address',
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Zonvo</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 16px;">Hi ${variables['firstName'] ?? 'there'},</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              Please verify your email address to activate your Zonvo account.
            </p>
            <div style="text-align: center; margin-bottom: 32px;">
              <a href="${variables['verifyLink'] ?? '#'}" style="background: #8b5cf6; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            <p style="color: #71717a; font-size: 14px;">This link expires in 24 hours. If you did not create a Zonvo account, you can safely ignore this email.</p>
          </div>
        `,
      },
      'auth.reset_password': {
        subject: 'Reset your Zonvo password',
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Zonvo</h1>
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
        subject: `You've been invited to join ${variables['orgName'] ?? 'an organization'} on Zonvo`,
        body: `
          <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; background: #0f0f0f; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #8b5cf6; font-size: 28px; margin: 0;">Zonvo</h1>
            </div>
            <h2 style="font-size: 22px; margin-bottom: 16px;">You have been invited!</h2>
            <p style="color: #a1a1aa; line-height: 1.6; margin-bottom: 24px;">
              <strong>${variables['inviterName'] ?? 'Someone'}</strong> has invited you to join <strong>${variables['orgName'] ?? 'their organization'}</strong> on Zonvo as a <strong>${variables['role'] ?? 'member'}</strong>.
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
    };

    const template = templates[templateKey];
    if (!template) {
      return {
        subject: 'Notification from Zonvo',
        html: `<p>You have a new notification from Zonvo.</p>`,
      };
    }

    return { subject: template.subject, html: template.body };
  }
}
