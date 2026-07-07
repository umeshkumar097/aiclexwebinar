import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, ILike, Raw } from 'typeorm';
import { AccessToken } from 'livekit-server-sdk';

import { Webinar, WebinarStatus, WebinarMode } from './entities/webinar.entity';

import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';

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
    // Create a stable LiveKit room name from webinar ID
    webinar.livekitRoom = `webinar-${id}`;

    // If enableRecording is set, mark recording as active in settings
    const settings = webinar.settings ?? {};
    if (settings.enableRecording) {
      settings.recordingStartedAt = new Date().toISOString();
      settings.recordingActive = true;
      webinar.settings = settings;
    }

    return this.webinarRepo.save(webinar);
  }

  async endLive(id: string, userId: string, orgId: string | null): Promise<Webinar> {
    const webinar = await this.findOne(id, userId, orgId);
    webinar.status = WebinarStatus.ENDED;
    webinar.endedAt = new Date();
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

  /** Generate a LiveKit token for the host to join the studio */
  async generateHostToken(id: string, userId: string, orgId: string | null, displayName: string): Promise<string> {
    const webinar = await this.findOne(id, userId, orgId);

    const apiKey = process.env.LIVEKIT_API_KEY ?? 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET ?? 'devsecret';
    const roomName = webinar.livekitRoom ?? `webinar-${id}`;

    const at = new AccessToken(apiKey, apiSecret, {
      identity: `host-${userId}`,
      name: displayName,
      ttl: '4h',
    });

    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      roomAdmin: true,
    });

    return await at.toJwt();
  }

  /** Generate join data for an attendee.
   *  - fully_live: returns LiveKit token
   *  - semi_live : returns video URL + current position for synchronized playback
   */
  async generateAttendeeToken(
    joinCode: string,
    displayName: string,
    password?: string,
  ): Promise<
    | { mode: 'fully_live'; token: string; roomName: string; webinarTitle: string; livekitUrl: string }
    | { mode: 'semi_live'; videoUrl: string; currentPositionSeconds: number; timedEvents: unknown[]; webinarTitle: string; webinarId: string }
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

    // ── Fully-Live: LiveKit token ───────────────────────────────────────────
    const apiKey    = process.env.LIVEKIT_API_KEY    ?? 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET ?? 'devsecret';
    const roomName  = webinar.livekitRoom ?? `webinar-${webinar.id}`;
    const livekitUrl = process.env.LIVEKIT_URL ?? 'wss://localhost:7880';

    const identity = `attendee-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const at = new AccessToken(apiKey, apiSecret, { identity, name: displayName, ttl: '4h' });
    at.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: false,
      canSubscribe: true,
      canPublishData: true,
    });

    return {
      mode: 'fully_live' as const,
      token: await at.toJwt(),
      roomName,
      webinarTitle: webinar.title,
      livekitUrl,
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
      registrants.push({
        id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        registeredAt: new Date().toISOString(),
      });
      settings.registrants = registrants;
      webinar.settings = settings;
      webinar.registeredCount = registrants.length;
      return this.webinarRepo.save(webinar);
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
}


