import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Job } from 'bullmq';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
// nodemailer loaded dynamically so build doesn't fail if not installed

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
      try {
        // Dynamic import so Docker build succeeds even if nodemailer not pre-installed
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const nodemailer = require('nodemailer') as typeof import('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort ?? 465,
          secure: smtpSecure !== false,
          auth: { user: smtpUser, pass: smtpPassword },
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
      } catch (smtpErr) {
        this.logger.warn(`SMTP failed, falling back to Resend: ${(smtpErr as Error).message}`);
      }
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

    const wrap = (body: string, preheader = '') => `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Aiclex Webinar</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:'Segoe UI',Arial,sans-serif;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#09090b;">${preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:32px 16px;"><tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#111113;border-radius:20px;border:1px solid #27272a;overflow:hidden;">
    <tr><td style="background:linear-gradient(135deg,#1e0a3c 0%,#2d1560 100%);padding:28px 40px;text-align:center;">
      <span style="color:#fff;font-size:20px;font-weight:700;">🎬 Aiclex Webinar</span>
    </td></tr>
    <tr><td style="padding:36px 40px 28px;">${body}</td></tr>
    <tr><td style="background:#0d0d0f;padding:20px 40px;text-align:center;border-top:1px solid #27272a;">
      <p style="color:#52525b;font-size:12px;margin:0 0 4px;">© 2025 Aiclex Webinar · <a href="https://webinar.zonvo.tech" style="color:#8b5cf6;text-decoration:none;">webinar.zonvo.tech</a></p>
      <p style="color:#3f3f46;font-size:11px;margin:0;">You received this because you have an account or registered for a webinar.</p>
    </td></tr>
  </table>
  </td></tr></table>
</body></html>`;

    const btn = (label: string, href: string, bg = '#8b5cf6') =>
      `<div style="text-align:center;margin:28px 0;"><a href="${href}" style="background:${bg};color:#fff;padding:15px 40px;border-radius:12px;text-decoration:none;font-weight:700;font-size:16px;display:inline-block;">${label}</a></div>`;

    const row = (icon: string, label: string, val: string) =>
      `<tr><td style="padding:11px 0;border-bottom:1px solid #27272a;"><span style="color:#71717a;font-size:13px;">${icon} ${label}</span><span style="color:#fff;font-size:14px;font-weight:600;float:right;">${val}</span></td></tr>`;

    const table = (rows: string) =>
      `<table width="100%" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:14px;padding:8px 20px;margin:20px 0;"><tbody>${rows}</tbody></table>`;

    const step = (n: string, t: string) =>
      `<div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:14px;"><div style="min-width:26px;height:26px;background:#8b5cf6;border-radius:7px;text-align:center;line-height:26px;font-size:12px;font-weight:700;color:#fff;flex-shrink:0;">${n}</div><p style="color:#a1a1aa;font-size:14px;line-height:1.6;margin:3px 0 0;">${t}</p></div>`;

    const divider = `<div style="height:1px;background:#27272a;margin:22px 0;"></div>`;

    const templates: Record<string, { subject: string; html: string }> = {

      'auth.verify_email': {
        subject: `✉️ Verify your email — Aiclex Webinar`,
        html: wrap(`
<h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 10px;">Verify your email address 👋</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 22px;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong>, welcome to Aiclex Webinar! You're one step away — click below to activate your account.</p>
<div style="background:linear-gradient(135deg,#1e0a3c,#18181b);border:1px solid #6d28d9;border-radius:14px;padding:20px 24px;margin-bottom:22px;text-align:center;">
  <p style="color:#c4b5fd;font-size:13px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Click below to activate your account</p>
  <p style="color:#6b7280;font-size:12px;margin:0;">Link expires in <strong style="color:#a1a1aa;">24 hours</strong></p>
</div>
${btn('✅ Verify Email & Activate Account', v['verifyLink'] ?? '#', '#7c3aed')}
${divider}
<p style="color:#52525b;font-size:12px;text-align:center;line-height:1.6;">Or copy: <span style="color:#8b5cf6;word-break:break-all;font-size:11px;">${v['verifyLink'] ?? '#'}</span></p>
<p style="color:#3f3f46;font-size:12px;text-align:center;margin-top:10px;">Didn't create an account? Ignore this email.</p>
`, `Verify your Aiclex Webinar account`),
      },

      'auth.account_activated': {
        subject: `🎉 Your Aiclex Webinar account is now active!`,
        html: wrap(`
<div style="text-align:center;margin-bottom:24px;">
  <div style="font-size:52px;margin-bottom:12px;">✅</div>
  <h1 style="color:#fff;font-size:24px;font-weight:700;margin:0 0 6px;">You're in, ${v['firstName'] ?? 'there'}!</h1>
  <p style="color:#a1a1aa;font-size:15px;margin:0;">Your account has been verified and activated.</p>
</div>
<div style="background:#0f2818;border:1px solid #16a34a;border-radius:14px;padding:20px 24px;margin-bottom:22px;">
  <p style="color:#86efac;font-size:14px;font-weight:600;margin:0 0 12px;">🚀 What you can do now:</p>
  ${step('1', 'Create your first webinar and go live instantly')}
  ${step('2', 'Schedule webinars with automatic email reminders')}
  ${step('3', 'Share registration links and manage attendees')}
  ${step('4', 'Record sessions and share replays')}
</div>
${btn('🏠 Go to Dashboard', v['dashboardLink'] ?? 'https://webinar.zonvo.tech/dashboard', '#059669')}
`, `Your Aiclex Webinar account is active — start hosting!`),
      },

      'auth.reset_password': {
        subject: `🔐 Reset your password — Aiclex Webinar`,
        html: wrap(`
<h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Password reset request</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 20px;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong>, we received a request to reset your password.</p>
${btn('🔐 Reset My Password', v['resetLink'] ?? '#', '#dc2626')}
<div style="background:#1c0a0a;border:1px solid #7f1d1d;border-radius:12px;padding:14px 18px;margin-top:8px;">
  <p style="color:#fca5a5;font-size:13px;margin:0;">⚠️ Expires in <strong>${v['expiryHours'] ?? '1'} hour</strong>. If you didn't request this, your account is safe.</p>
</div>
`, `Reset your Aiclex Webinar password`),
      },

      'member.invited': {
        subject: `🤝 You've been invited to join ${v['orgName'] ?? 'a workspace'} on Aiclex Webinar`,
        html: wrap(`
<h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Team invitation 🎊</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 20px;">
  <strong style="color:#c4b5fd;">${v['inviterName'] ?? 'Someone'}</strong> invited you to join
  <strong style="color:#fff;">${v['orgName'] ?? 'their workspace'}</strong> as
  <span style="background:#2d1560;color:#c4b5fd;padding:2px 8px;border-radius:6px;font-size:13px;font-weight:600;">${v['role'] ?? 'member'}</span>.
</p>
${btn('🤝 Accept Invitation', v['acceptLink'] ?? '#', '#8b5cf6')}
<p style="color:#52525b;font-size:12px;text-align:center;margin-top:8px;">Expires in <strong style="color:#a1a1aa;">24 hours</strong></p>
`, `Join ${v['orgName'] ?? 'the workspace'} on Aiclex Webinar`),
      },

      'webinar.registration_confirmed': {
        subject: `✅ You're registered: "${v['webinarTitle'] ?? 'Webinar'}" — your joining link inside`,
        html: wrap(`
<div style="background:linear-gradient(135deg,#1e0a3c,#18181b);border:1px solid #6d28d9;border-radius:16px;padding:24px;text-align:center;margin-bottom:24px;">
  <div style="font-size:40px;margin-bottom:10px;">🎓</div>
  <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">You're registered!</h1>
  <p style="color:#c4b5fd;font-size:14px;margin:0;">${v['webinarTitle'] ?? 'Webinar'}</p>
</div>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 16px;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong> 👋 — your spot is confirmed. Save this email — it has your personal joining link.</p>
${table(`
  ${v['webinarDate'] ? row('📅', 'Date', v['webinarDate']) : ''}
  ${v['webinarTime'] ? row('🕐', 'Time', v['webinarTime']) : ''}
  ${v['hostName'] ? row('🎙️', 'Host', v['hostName']) : ''}
  ${row('🔗', 'Join', 'See button below')}
`)}
<div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:14px;padding:24px;text-align:center;margin:20px 0;">
  <p style="color:#c4b5fd;font-size:12px;font-weight:600;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.08em;">Your personal joining link</p>
  <p style="color:#a1a1aa;font-size:11px;margin:0 0 18px;">Do not share this link</p>
  <a href="${v['joinLink'] ?? '#'}" style="background:#fff;color:#6d28d9;padding:13px 32px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;display:inline-block;">🚀 Join Webinar</a>
</div>
${divider}
<p style="color:#fff;font-size:14px;font-weight:600;margin:0 0 12px;">📋 How to join:</p>
${step('1', `Click "Join Webinar" above at the scheduled time`)}
${step('2', 'Your name is pre-filled — just click to enter the room')}
${step('3', 'Ensure speakers/headphones are connected')}
${step('4', 'Join 2–3 minutes early for best experience')}
${divider}
<p style="color:#52525b;font-size:12px;text-align:center;">You'll get reminder emails <strong style="color:#a1a1aa;">24h</strong>, <strong style="color:#a1a1aa;">1h</strong>, and <strong style="color:#a1a1aa;">15min</strong> before.</p>
`, `You're registered for ${v['webinarTitle']} — save your link`),
      },

      'webinar.reminder_24h': {
        subject: `⏰ Tomorrow: "${v['webinarTitle'] ?? 'Webinar'}" — your joining link`,
        html: wrap(`
<h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">See you tomorrow! ⏰</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 18px;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong> — <strong style="color:#c4b5fd;">${v['webinarTitle'] ?? 'your webinar'}</strong> is tomorrow. Don't forget!</p>
${table(`
  ${v['webinarDate'] ? row('📅', 'Date', v['webinarDate']) : ''}
  ${v['webinarTime'] ? row('🕐', 'Time', v['webinarTime']) : ''}
`)}
${btn('🔗 Join Webinar', v['joinLink'] ?? '#', '#8b5cf6')}
<p style="color:#52525b;font-size:12px;text-align:center;">Set a reminder on your phone 🗓️</p>
`, `${v['webinarTitle']} is tomorrow — save your link`),
      },

      'webinar.reminder_1h': {
        subject: `🔔 STARTING IN 1 HOUR: "${v['webinarTitle'] ?? 'Webinar'}"`,
        html: wrap(`
<div style="text-align:center;margin-bottom:22px;">
  <div style="display:inline-block;background:#1c1208;border:2px solid #f59e0b;border-radius:14px;padding:12px 24px;">
    <p style="color:#fbbf24;font-size:30px;font-weight:800;margin:0;letter-spacing:-1px;">1 HOUR</p>
    <p style="color:#78350f;font-size:11px;margin:0;font-weight:600;text-transform:uppercase;">Until it starts</p>
  </div>
</div>
<h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;">Get ready to join, ${v['firstName'] ?? 'there'}!</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 22px;text-align:center;"><strong style="color:#c4b5fd;">${v['webinarTitle'] ?? 'Your webinar'}</strong> starts in 1 hour.</p>
${btn('🔗 Open Joining Link', v['joinLink'] ?? '#', '#f59e0b')}
<div style="background:#1c1208;border:1px solid #78350f;border-radius:12px;padding:14px 18px;">
  <p style="color:#fbbf24;font-size:13px;font-weight:600;margin:0 0 6px;">⚡ Quick prep:</p>
  <p style="color:#92400e;font-size:13px;margin:3px 0;">✓ Stable internet · ✓ Speakers/headphones on · ✓ Quiet space ready</p>
</div>
`, `${v['webinarTitle']} starts in 1 hour`),
      },

      'webinar.reminder_15m': {
        subject: `🚨 15 MINUTES: "${v['webinarTitle'] ?? 'Webinar'}" — Join right now!`,
        html: wrap(`
<div style="text-align:center;margin-bottom:24px;">
  <div style="display:inline-block;background:#1c0a0a;border:2px solid #dc2626;border-radius:14px;padding:12px 24px;">
    <p style="color:#ef4444;font-size:32px;font-weight:800;margin:0;letter-spacing:-1px;">15 MIN</p>
    <p style="color:#991b1b;font-size:11px;margin:0;font-weight:600;text-transform:uppercase;">Starting very soon!</p>
  </div>
</div>
<h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;text-align:center;">${v['webinarTitle'] ?? 'Your webinar'} is about to start! ⚡</h1>
<p style="color:#a1a1aa;font-size:15px;margin:0 0 22px;text-align:center;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong> — don't miss it!</p>
<div style="background:linear-gradient(135deg,#7f1d1d,#1c0a0a);border-radius:14px;padding:22px;text-align:center;margin:0 0 14px;">
  <a href="${v['joinLink'] ?? '#'}" style="background:#ef4444;color:#fff;padding:16px 44px;border-radius:12px;text-decoration:none;font-weight:800;font-size:17px;display:inline-block;">🔴 JOIN NOW</a>
</div>
<p style="color:#52525b;font-size:11px;text-align:center;">Link: <span style="color:#8b5cf6;word-break:break-all;">${v['joinLink'] ?? '#'}</span></p>
`, `${v['webinarTitle']} starts in 15 minutes — join now!`),
      },

      'webinar.started': {
        subject: `🔴 LIVE NOW: "${v['webinarTitle'] ?? 'Webinar'}" has started — join instantly!`,
        html: wrap(`
<div style="text-align:center;margin-bottom:22px;">
  <div style="display:inline-flex;align-items:center;gap:8px;background:#dc2626;padding:10px 22px;border-radius:999px;">
    <span style="width:10px;height:10px;background:#fff;border-radius:50%;display:inline-block;"></span>
    <span style="color:#fff;font-weight:800;font-size:15px;letter-spacing:0.08em;">LIVE NOW</span>
  </div>
</div>
<h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;text-align:center;">${v['webinarTitle'] ?? 'Your webinar'} is LIVE!</h1>
<p style="color:#a1a1aa;font-size:15px;line-height:1.7;margin:0 0 24px;text-align:center;">Hi <strong style="color:#fff;">${v['firstName'] ?? 'there'}</strong> — join now so you don't miss anything!</p>
<div style="background:linear-gradient(135deg,#7f1d1d,#1c0a0a);border:2px solid #dc2626;border-radius:14px;padding:22px;text-align:center;">
  <a href="${v['joinLink'] ?? '#'}" style="background:#dc2626;color:#fff;padding:16px 48px;border-radius:12px;text-decoration:none;font-weight:800;font-size:17px;display:inline-block;">🔴 Watch Live Now</a>
</div>
`, `${v['webinarTitle']} is live now — click to join!`),
      },
    };

    const tmpl = templates[templateKey];
    if (!tmpl) {
      return {
        subject: 'Notification from Aiclex Webinar',
        html: wrap(`<p style="color:#a1a1aa;text-align:center;">You have a new notification from Aiclex Webinar.</p>`),
      };
    }

    return { subject: tmpl.subject, html: tmpl.html };
  }
}
