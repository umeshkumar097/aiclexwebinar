import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, Raw } from 'typeorm';
// ─── MediaSoup Server helper ──────────────────────────────────────────────────
async function mediasoupFetch(path: string, method = 'GET', body?: unknown): Promise<any> {
  const serverUrl = process.env.MEDIASOUP_SERVER_URL ?? 'http://4.236.163.156:2000';
  const secret    = process.env.MEDIASOUP_API_SECRET ?? 'zonvo_mediasoup_secret_2024';

  const res = await fetch(`${serverUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-mediasoup-secret': secret,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`MediaSoup server error ${res.status}: ${text}`);
  }
  return res.json();
}

import { Webinar, WebinarStatus, WebinarMode } from './entities/webinar.entity';

import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';
import { NotificationsService } from '../notifications/notifications.service';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateJoinCode(): string {
  // 8-digit numeric code: 10000000 – 99999999
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

@Injectable()
export class WebinarsService {
  constructor(
    @InjectRepository(Webinar)
    private readonly webinarRepo: Repository<Webinar>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(userId: string, orgId: string | null, dto: CreateWebinarDto): Promise<Webinar> {
    // Generate unique join code
    let joinCode = generateJoinCode();
    // Retry if collision (extremely rare)
    while (await this.webinarRepo.findOne({ where: { joinCode } })) {
      joinCode = generateJoinCode();
    }

    const webinar = this.webinarRepo.create({
      hostUserId: userId,
      organizationId: orgId,
      title: dto.title,
      description: dto.description ?? null,
      mode: dto.mode,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      durationMinutes: dto.durationMinutes ?? 60,
      maxAttendees: dto.maxAttendees ?? 100,
      password: dto.password ?? null,
      status: WebinarStatus.DRAFT,
      joinCode,
      videoUrl: dto.videoUrl ?? null,
      replayUrl: dto.replayUrl ?? null,
      // Persist all feature toggle settings into JSONB column
      settings: dto.settings ? { ...dto.settings } : {},
    });
    return this.webinarRepo.save(webinar);
  }

  async findAll(
    userId: string,
    orgId: string | null,
    opts: { status?: string; search?: string; page?: number; limit?: number },
  ) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(50, opts.limit ?? 20);
    const skip = (page - 1) * limit;

    const where: FindManyOptions<Webinar>['where'] = orgId
      ? { organizationId: orgId }
      : { hostUserId: userId };

    if (opts.status && opts.status !== 'all') {
      Object.assign(where, { status: opts.status as WebinarStatus });
    }
    if (opts.search) {
      Object.assign(where, { title: ILike(`%${opts.search}%`) });
    }

    const [items, total] = await this.webinarRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async findOne(id: string, userId: string, orgId: string | null): Promise<Webinar> {
    const webinar = await this.webinarRepo.findOne({ where: { id } });
    if (!webinar) throw new NotFoundException('Webinar not found');
    if (orgId && webinar.organizationId !== orgId && webinar.hostUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    if (!orgId && webinar.hostUserId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return webinar;
  }

  /** Public lookup by join code — no auth required */
  async findByJoinCode(joinCode: string): Promise<Webinar> {
    const webinar = await this.webinarRepo.findOne({
      where: { joinCode: joinCode.toUpperCase() },
    });
    if (!webinar) throw new NotFoundException('Webinar not found. Check your join code.');
    return webinar;
  }

  async update(id: string, userId: string, orgId: string | null, dto: UpdateWebinarDto): Promise<Webinar> {
    const webinar = await this.findOne(id, userId, orgId);
    Object.assign(webinar, {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.mode !== undefined && { mode: dto.mode }),
      ...(dto.scheduledAt !== undefined && { scheduledAt: new Date(dto.scheduledAt) }),
      ...(dto.durationMinutes !== undefined && { durationMinutes: dto.durationMinutes }),
      ...(dto.maxAttendees !== undefined && { maxAttendees: dto.maxAttendees }),
      ...(dto.status !== undefined && { status: dto.status }),
      ...(dto.password !== undefined && { password: dto.password }),
      ...(dto.videoUrl !== undefined && { videoUrl: dto.videoUrl }),
      ...(dto.timedEvents !== undefined && { timedEvents: dto.timedEvents }),
      ...(dto.replayUrl !== undefined && { replayUrl: dto.replayUrl }),
      // Deep-merge settings so existing keys (registrants, attendees etc.) are preserved
      ...(dto.settings !== undefined && {
        settings: { ...(webinar.settings ?? {}), ...dto.settings },
      }),
    });
    return this.webinarRepo.save(webinar);
  }



  async goLive(id: string, userId: string, orgId: string | null): Promise<Webinar> {
    const webinar = await this.findOne(id, userId, orgId);
    webinar.status = WebinarStatus.LIVE;
    webinar.startedAt = new Date();
    // Use webinar ID as the MediaSoup room ID
    webinar.livekitRoom = `webinar-${id}`; // field reused as mediasoupRoom

    const settings = webinar.settings ?? {};

    // Pre-warm the MediaSoup room (creates router on media VPS)
    try {
      await mediasoupFetch(`/api/rooms/webinar-${id}/rtp-capabilities`);
      console.log(`[MediaSoup] Room webinar-${id} pre-warmed`);
    } catch (err) {
      console.error('[MediaSoup] Failed to pre-warm room:', err);
    }

    if (settings.enableRecording) {
      settings.recordingStartedAt = new Date().toISOString();
      settings.recordingActive = true;
      // Note: Full recording pipeline with MediaSoup requires FFmpeg egress (Phase 2 TODO)
      webinar.settings = settings;
    }

    const saved = await this.webinarRepo.save(webinar);

    // Notify all registered attendees that webinar has started
    const registrants = (settings.registrants as any[]) || [];
    const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3001';
    for (const registrant of registrants) {
      if (!registrant.email) continue;
      try {
        await this.notificationsService.queue(
          'email',
          registrant.email,
          'webinar.started',
          {
            firstName: registrant.name || 'there',
            webinarTitle: webinar.title,
            webinarDate: webinar.scheduledAt
              ? new Date(webinar.scheduledAt).toLocaleDateString()
              : new Date().toLocaleDateString(),
            webinarTime: webinar.scheduledAt
              ? new Date(webinar.scheduledAt).toLocaleTimeString()
              : new Date().toLocaleTimeString(),
            joinLink: `${frontendUrl}/join/${webinar.joinCode}`,
            hostName: 'The Host',
          },
          { userId: registrant.userId },
        );
      } catch (err) {
        console.error(`Failed to queue webinar.started email for ${registrant.email}:`, err);
      }
    }

    return saved;
  }

  async endLive(id: string, userId: string, orgId: string | null): Promise<Webinar> {
    const webinar = await this.findOne(id, userId, orgId);
    webinar.status = WebinarStatus.ENDED;
    webinar.endedAt = new Date();

    const settings = webinar.settings ?? {};
    settings.recordingActive = false;
    webinar.settings = settings;

    // Destroy MediaSoup room to free resources
    try {
      await mediasoupFetch(`/api/rooms/webinar-${id}/close`, 'POST');
      console.log(`[MediaSoup] Room webinar-${id} destroyed`);
    } catch (err) {
      console.error('[MediaSoup] Failed to destroy room:', err);
    }

    return this.webinarRepo.save(webinar);
  }

  async remove(id: string, userId: string, orgId: string | null): Promise<void> {
    const webinar = await this.findOne(id, userId, orgId);
    webinar.settings = webinar.settings || {};
    webinar.settings.isDeleted = true;
    await this.webinarRepo.save(webinar);
  }

  async getStats(userId: string, orgId: string | null) {
    const base: any = orgId ? { organizationId: orgId } : { hostUserId: userId };
    base.settings = Raw(() => `("settings"->>'isDeleted') IS NULL OR ("settings"->>'isDeleted') != 'true'`);

    const [total, live, scheduled, draft] = await Promise.all([
      this.webinarRepo.count({ where: base }),
      this.webinarRepo.count({ where: { ...base, status: WebinarStatus.LIVE } }),
      this.webinarRepo.count({ where: { ...base, status: WebinarStatus.SCHEDULED } }),
      this.webinarRepo.count({ where: { ...base, status: WebinarStatus.DRAFT } }),
    ]);

    return { total, live, scheduled, draft };
  }

  /** Generate MediaSoup room credentials for the host */
  async generateHostToken(id: string, userId: string, orgId: string | null, displayName: string): Promise<{
    roomId: string;
    peerId: string;
    role: 'host';
    mediasoupServerUrl: string;
    mediasoupSecret: string;
  }> {
    await this.findOne(id, userId, orgId);

    const roomId = `webinar-${id}`;
    const peerId = `host-${userId}`;
    const mediasoupServerUrl = process.env.MEDIASOUP_SERVER_URL ?? 'http://4.236.163.156:2000';
    const mediasoupSecret   = process.env.MEDIASOUP_API_SECRET  ?? 'zonvo_mediasoup_secret_2024';

    // Pre-warm room (idempotent)
    try {
      await mediasoupFetch(`/api/rooms/${roomId}/rtp-capabilities`);
    } catch (err) {
      console.error('[MediaSoup] Room pre-warm failed:', err);
    }

    return { roomId, peerId, role: 'host', mediasoupServerUrl, mediasoupSecret };
  }

  /** Generate join data for an attendee.
   *  - fully_live: returns MediaSoup room credentials
   *  - semi_live : returns video URL + current position for synchronized playback
   */
  async generateAttendeeToken(
    joinCode: string,
    displayName: string,
    password?: string,
  ): Promise<
    | { mode: 'fully_live'; roomId: string; peerId: string; mediasoupServerUrl: string; mediasoupSecret: string; webinarTitle: string; settings: any }
    | { mode: 'semi_live'; videoUrl: string; currentPositionSeconds: number; timedEvents: unknown[]; webinarTitle: string; webinarId: string; settings: any }
  > {
    const webinar = await this.findByJoinCode(joinCode);

    if (webinar.status !== WebinarStatus.LIVE) {
      throw new ForbiddenException('This webinar is not currently live.');
    }

    if (webinar.password && webinar.password !== password) {
      throw new ForbiddenException('Incorrect webinar password.');
    }

    // ── Semi-Live: synchronized video playback ──────────────────────────────
    if (webinar.mode === WebinarMode.SEMI_LIVE) {
      const startedAt  = webinar.startedAt ?? new Date();
      const elapsedMs  = Date.now() - startedAt.getTime();
      const currentPositionSeconds = Math.max(0, Math.floor(elapsedMs / 1000));

      return {
        mode: 'semi_live' as const,
        videoUrl:               webinar.videoUrl ?? '',
        currentPositionSeconds,
        timedEvents:            webinar.timedEvents ?? [],
        webinarTitle:           webinar.title,
        webinarId:              webinar.id,
        settings:               webinar.settings ?? {},
      };
    }

    // ── Fully-Live: MediaSoup credentials ──────────────────────────────────
    const roomId  = webinar.livekitRoom ?? `webinar-${webinar.id}`;
    const peerId  = `attendee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const mediasoupServerUrl = process.env.MEDIASOUP_SERVER_URL ?? 'http://4.236.163.156:2000';
    const mediasoupSecret    = process.env.MEDIASOUP_API_SECRET  ?? 'zonvo_mediasoup_secret_2024';

    return {
      mode: 'fully_live' as const,
      roomId,
      peerId,
      mediasoupServerUrl,
      mediasoupSecret,
      webinarTitle: webinar.title,
      settings: webinar.settings ?? {},
    };
  }

  // ── Register attendee (Save in webinar settings jsonb) ────────────────────
  async registerAttendee(id: string, name: string, email: string): Promise<Webinar> {
    const webinar = await this.webinarRepo.findOneBy({ id });
    if (!webinar) throw new NotFoundException('Webinar not found');

    const settings = webinar.settings || {};
    const registrants = (settings.registrants as any[]) || [];

    // Check if email already registered
    const exists = registrants.some((r) => r.email === email);
    if (!exists) {
      const registrant = {
        id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        registeredAt: new Date().toISOString(),
      };
      registrants.push(registrant);
      settings.registrants = registrants;
      webinar.settings = settings;
      webinar.registeredCount = registrants.length;
      const saved = await this.webinarRepo.save(webinar);

      // Send registration confirmation email
      const frontendUrl = process.env['FRONTEND_URL'] ?? 'http://localhost:3001';
      try {
        await this.notificationsService.queue(
          'email',
          registrant.email,
          'webinar.registration_confirmed',
          {
            firstName: registrant.name || 'there',
            webinarTitle: webinar.title,
            webinarDate: webinar.scheduledAt
              ? new Date(webinar.scheduledAt).toLocaleDateString()
              : 'TBD',
            webinarTime: webinar.scheduledAt
              ? new Date(webinar.scheduledAt).toLocaleTimeString()
              : 'TBD',
            joinLink: `${frontendUrl}/join/${webinar.joinCode}`,
            hostName: 'The Host',
          },
          { userId: registrant.id },
        );
      } catch (err) {
        console.error('Failed to queue registration confirmation email:', err);
      }

      // Queue scheduled reminder emails if webinar has a scheduledAt
      if (webinar.scheduledAt) {
        const scheduledAt = new Date(webinar.scheduledAt).getTime();
        const reminderData = {
          firstName: registrant.name || 'there',
          webinarTitle: webinar.title,
          webinarDate: new Date(webinar.scheduledAt).toLocaleDateString(),
          webinarTime: new Date(webinar.scheduledAt).toLocaleTimeString(),
          joinLink: `${frontendUrl}/join/${webinar.joinCode}`,
          hostName: 'The Host',
        };

        const reminders: Array<{ template: string; delay: number; label: string }> = [
          { template: 'webinar.reminder_24h', delay: scheduledAt - 24 * 60 * 60 * 1000, label: '24h' },
          { template: 'webinar.reminder_1h', delay: scheduledAt - 60 * 60 * 1000, label: '1h' },
          { template: 'webinar.reminder_15m', delay: scheduledAt - 15 * 60 * 1000, label: '15m' },
        ];

        for (const reminder of reminders) {
          if (reminder.delay > Date.now()) {
            try {
              await this.notificationsService.queue(
                'email',
                registrant.email,
                reminder.template,
                reminderData,
                {
                  userId: registrant.id,
                  scheduledAt: new Date(reminder.delay),
                },
              );
            } catch (err) {
              console.error(`Failed to queue ${reminder.label} reminder for ${registrant.email}:`, err);
            }
          }
        }
      }

      return saved;
    }
    return webinar;
  }

  // ── Track joining attendee (Save in webinar settings jsonb) ────────────────
  async trackJoin(id: string, clientId: string, name: string, email?: string): Promise<Webinar> {
    const webinar = await this.webinarRepo.findOneBy({ id });
    if (!webinar) return null as any;

    const settings = webinar.settings || {};
    const attendees = (settings.attendees as any[]) || [];

    // Check if already tracked
    const exists = attendees.some((a) => a.id === clientId);
    if (!exists) {
      attendees.push({
        id: clientId,
        name: name.trim(),
        email: email?.trim().toLowerCase() || '',
        joinedAt: new Date().toISOString(),
        leftAt: null,
        durationSeconds: 0,
      });
      settings.attendees = attendees;
      webinar.settings = settings;
      webinar.attendeeCount = attendees.length;
      return this.webinarRepo.save(webinar);
    }
    return webinar;
  }

  // ── Update watcher duration when connection closes ─────────────────────────
  async updateAttendeeDuration(id: string, clientId: string, durationSeconds: number): Promise<Webinar> {
    const webinar = await this.webinarRepo.findOneBy({ id });
    if (!webinar) return null as any;

    const settings = webinar.settings || {};
    const attendees = (settings.attendees as any[]) || [];

    const attendee = attendees.find((a) => a.id === clientId);
    if (attendee) {
      attendee.leftAt = new Date().toISOString();
      attendee.durationSeconds = Math.max(attendee.durationSeconds || 0, durationSeconds);
      settings.attendees = attendees;
      webinar.settings = settings;
      return this.webinarRepo.save(webinar);
    }
    return webinar;
  }

  // ── Get MediaSoup room info (for debugging) ────────────────────────────────
  async getMediasoupRoomInfo(id: string): Promise<any> {
    try {
      return await mediasoupFetch(`/api/rooms/webinar-${id}/rtp-capabilities`);
    } catch {
      return null;
    }
  }

  // ── Task 5: Create webinar and immediately go live ────────────────────────
  async createAndGoLive(dto: CreateWebinarDto, userId: string, orgId: string | null): Promise<Webinar> {
    // Create with DRAFT status first, then immediately go live
    const webinar = await this.create(userId, orgId, {
      ...dto,
      title: dto.title || `Live Session ${new Date().toLocaleDateString()}`,
    });
    return this.goLive(webinar.id, userId, orgId);
  }
}


