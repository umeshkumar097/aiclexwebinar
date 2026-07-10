import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { FastifyReply } from 'fastify';
import { v4 as uuidv4 } from 'uuid';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy';
import { WebinarsService } from './webinars.service';
import { CreateWebinarDto } from './dto/create-webinar.dto';
import { UpdateWebinarDto } from './dto/update-webinar.dto';
import { R2Service } from '../storage/r2.service';
import { SseService } from './sse.service';

@Controller('webinars')
export class WebinarsController {
  constructor(
    private readonly webinarsService: WebinarsService,
    private readonly r2: R2Service,
    private readonly sse: SseService,
  ) {}

  // ── Public: lookup by join code (no auth) ─────────────────────────────────
  @Get('join/:code')
  async findByCode(@Param('code') code: string) {
    const webinar = await this.webinarsService.findByJoinCode(code);
    const s = webinar.settings ?? {};
    // Return limited public info — only what the attendee page needs
    return {
      success: true,
      data: {
        id: webinar.id,
        title: webinar.title,
        description: webinar.description,
        status: webinar.status,
        mode: webinar.mode,
        scheduledAt: webinar.scheduledAt,
        durationMinutes: webinar.durationMinutes,
        maxAttendees: webinar.maxAttendees,
        registeredCount: webinar.registeredCount,
        hasPassword: !!webinar.password,
        joinCode: webinar.joinCode,
        thumbnailUrl: webinar.thumbnailUrl ?? null,
        // Public-safe settings flags
        settings: {
          waitingRoom:          !!s.waitingRoom,
          waitingThumbnailUrl:  s.waitingThumbnailUrl ?? null,
          requireRegistration:  !!s.requireRegistration,
          requireLogin:         !!s.requireLogin,
          privateWebinar:       !!s.privateWebinar,
          enableWatermark:      !!s.enableWatermark,
          showLiveCount:        s.showLiveCount !== false,
          enableChat:           s.enableChat !== false,
          enablePolls:          s.enablePolls !== false,

        },
      },
    };
  }

  // ── Public: register attendee for webinar ────────────────────────────────
  @Post('join/:code/register')
  @HttpCode(HttpStatus.CREATED)
  async registerAttendee(
    @Param('code') code: string,
    @Body() body: { name: string; email: string },
  ) {
    const webinar = await this.webinarsService.findByJoinCode(code);
    const updated = await this.webinarsService.registerAttendee(webinar.id, body.name, body.email);
    return { success: true, data: { registeredCount: updated.registeredCount } };
  }

  // ── Public: attendee join token ────────────────────────────────────────────
  @Post('join/:code/token')
  @HttpCode(HttpStatus.OK)
  async getAttendeeToken(
    @Param('code') code: string,
    @Body() body: { displayName: string; password?: string; email?: string },
  ) {
    const result = await this.webinarsService.generateAttendeeToken(
      code,
      body.displayName ?? 'Attendee',
      body.password,
    );

    // Track joining
    const webinar = await this.webinarsService.findByJoinCode(code);
    const clientId = `token-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    await this.webinarsService.trackJoin(webinar.id, clientId, body.displayName ?? 'Attendee', body.email);

    return { success: true, data: result };
  }


  // ── Protected routes below ─────────────────────────────────────────────────

  // GET /api/v1/webinars
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.webinarsService.findAll(user.userId, user.orgId ?? null, {
      status,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { success: true, data: result };
  }

  // GET /api/v1/webinars/stats
  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    const stats = await this.webinarsService.getStats(user.userId, user.orgId ?? null);
    return { success: true, data: stats };
  }

  // GET /api/v1/webinars/:id
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    return { success: true, data: webinar };
  }

  // POST /api/v1/webinars
  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateWebinarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.create(user.userId, user.orgId ?? null, dto);
    return { success: true, data: webinar };
  }

  // PATCH /api/v1/webinars/:id
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWebinarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.update(id, user.userId, user.orgId ?? null, dto);
    return { success: true, data: webinar };
  }

  // POST /api/v1/webinars/:id/go-live
  @Post(':id/go-live')
  @UseGuards(JwtAuthGuard)
  async goLive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.goLive(id, user.userId, user.orgId ?? null);
    return { success: true, data: webinar };
  }

  // POST /api/v1/webinars/:id/end
  @Post(':id/end')
  @UseGuards(JwtAuthGuard)
  async endLive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.endLive(id, user.userId, user.orgId ?? null);
    // Notify all connected attendees that session is over
    this.sse.broadcast(webinar.id, {
      type: 'session_ended',
      data: { message: 'The webinar has ended. Thank you for joining!' },
    });
    return { success: true, data: webinar };
  }

  // ── Waiting Room: attendee requests admission ──────────────────────────────
  // POST /api/v1/webinars/join/:code/waiting-room
  @Post('join/:code/waiting-room')
  @HttpCode(HttpStatus.OK)
  async joinWaitingRoom(
    @Param('code') code: string,
    @Body() body: { name: string; email?: string },
  ) {
    const webinar = await this.webinarsService.findByJoinCode(code);
    const s = webinar.settings ?? {};

    // Only relevant if waitingRoom is ON
    if (!s.waitingRoom) {
      return { success: true, data: { admitted: true, message: 'No waiting room — proceed to join.' } };
    }

    // Add to pending list
    const pending = (s.pendingAttendees as any[]) || [];
    const id = `wr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const alreadyThere = pending.some((p) => p.email && p.email === body.email?.toLowerCase());
    if (!alreadyThere) {
      pending.push({ id, name: body.name.trim(), email: body.email?.toLowerCase() ?? '', requestedAt: new Date().toISOString(), status: 'pending' });
      s.pendingAttendees = pending;
      webinar.settings = s;
      await this.webinarsService['webinarRepo'].save(webinar);
    }

    // Notify host via SSE
    this.sse.broadcast(webinar.id, {
      type: 'waiting_room_request',
      data: { id, name: body.name, email: body.email ?? '' },
    });

    return { success: true, data: { admitted: false, waitingId: id } };
  }

  // ── Waiting Room: host approves/rejects ──────────────────────────────────
  // POST /api/v1/webinars/:id/waiting-room/:waitingId/admit
  @Post(':id/waiting-room/:waitingId/admit')
  @UseGuards(JwtAuthGuard)
  async admitFromWaitingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('waitingId') waitingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const s = webinar.settings ?? {};
    const pending = (s.pendingAttendees as any[]) || [];
    const attendee = pending.find((p) => p.id === waitingId);
    if (attendee) attendee.status = 'admitted';
    s.pendingAttendees = pending;
    webinar.settings = s;
    await this.webinarsService['webinarRepo'].save(webinar);

    // Notify via SSE so attendee polling can detect they're admitted
    this.sse.broadcast(id, { type: 'waiting_room_admitted', data: { waitingId } });

    return { success: true };
  }

  // POST /api/v1/webinars/:id/waiting-room/:waitingId/reject
  @Post(':id/waiting-room/:waitingId/reject')
  @UseGuards(JwtAuthGuard)
  async rejectFromWaitingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('waitingId') waitingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const s = webinar.settings ?? {};
    const pending = (s.pendingAttendees as any[]) || [];
    const attendee = pending.find((p) => p.id === waitingId);
    if (attendee) attendee.status = 'rejected';
    s.pendingAttendees = pending;
    webinar.settings = s;
    await this.webinarsService['webinarRepo'].save(webinar);

    this.sse.broadcast(id, { type: 'waiting_room_rejected', data: { waitingId } });
    return { success: true };
  }

  // GET /api/v1/webinars/:id/waiting-room (host sees pending list)
  @Get(':id/waiting-room')
  @UseGuards(JwtAuthGuard)
  async getWaitingRoom(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const s = webinar.settings ?? {};
    const pending = ((s.pendingAttendees as any[]) || []).filter((p) => p.status === 'pending');
    return { success: true, data: { pending } };
  }

  // ── Check waiting room status (attendee polls this) ───────────────────────
  // GET /api/v1/webinars/join/:code/waiting-room/:waitingId
  @Get('join/:code/waiting-room/:waitingId')
  async checkWaitingStatus(
    @Param('code') code: string,
    @Param('waitingId') waitingId: string,
  ) {
    const webinar = await this.webinarsService.findByJoinCode(code);
    const s = webinar.settings ?? {};
    const pending = (s.pendingAttendees as any[]) || [];
    const entry = pending.find((p) => p.id === waitingId);
    return { success: true, data: { status: entry?.status ?? 'pending' } };
  }


  // POST /api/v1/webinars/:id/host-token  (MediaSoup room credentials for host)
  @Post(':id/host-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getHostToken(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { displayName?: string },
  ) {
    const data = await this.webinarsService.generateHostToken(
      id,
      user.userId,
      user.orgId ?? null,
      body.displayName ?? 'Host',
    );
    return { success: true, data };
  }

  // DELETE /api/v1/webinars/:id
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.webinarsService.remove(id, user.userId, user.orgId ?? null);
  }

  // ── POST /api/v1/webinars/:id/video-upload-url ───────────────────────────
  // Returns a presigned R2 PUT URL so the host can upload a video directly
  @Post(':id/video-upload-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getVideoUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { filename: string; contentType: string },
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const result = await this.r2.getUploadUrl(
      'uploads',
      id,
      body.filename ?? 'video.mp4',
      body.contentType ?? 'video/mp4',
      3600,
    );
    return { success: true, data: result };
  }

  // ── POST /api/v1/webinars/:id/upload-video ────────────────────────────────
  // Proxy upload: browser sends file to backend → backend uploads to R2
  // Bypasses browser CORS restrictions on R2 bucket
  @Post(':id/upload-video')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async uploadVideoProxy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);

    // Collect multipart file using Fastify's built-in multipart
    const data = await (req as any).file();
    if (!data) throw new Error('No file received');

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const result = await this.r2.uploadBuffer(
      'uploads',
      id,
      data.filename ?? 'video.mp4',
      data.mimetype ?? 'video/mp4',
      buffer,
    );

    // Save videoUrl to the webinar
    await this.webinarsService.update(id, user.userId, user.orgId ?? null, {
      videoUrl: result.publicUrl,
    });

    return { success: true, data: result };
  }

  // ── POST /api/v1/webinars/:id/recording-upload-url ──────────────────────
  // Returns a presigned R2/MinIO PUT URL for recording storage (CORS must be configured)
  @Post(':id/recording-upload-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRecordingUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { filename: string; contentType?: string },
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);

    const result = await this.r2.getUploadUrl(
      'recordings',
      id,
      body.filename ?? 'recording.mp4',
      body.contentType ?? 'video/mp4',
      7200, // 2 hours
    );
    return { success: true, data: result };
  }

  // ── POST /api/v1/webinars/:id/upload-recording ───────────────────────────
  // Proxy recording upload: browser sends file → backend uploads to storage
  // This avoids CORS issues when MinIO is only accessible internally
  @Post(':id/upload-recording')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async uploadRecordingProxy(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: FastifyRequest,
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);

    const data = await (req as any).file();
    if (!data) throw new Error('No file received');

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const result = await this.r2.uploadBuffer(
      'recordings',
      id,
      data.filename ?? 'recording.webm',
      data.mimetype ?? 'video/webm',
      buffer,
    );

    // Save replayUrl to the webinar
    await this.webinarsService.update(id, user.userId, user.orgId ?? null, {
      replayUrl: result.publicUrl,
    });

    return { success: true, data: result };
  }


  // ── POST /api/v1/webinars/:id/image-upload-url ───────────────────────────
  // Returns a presigned R2 PUT URL so the host can upload an image directly
  @Post(':id/image-upload-url')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getImageUploadUrl(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { filename: string; contentType?: string },
  ) {
    // Verify ownership
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);

    const result = await this.r2.getUploadUrl(
      'thumbnails',
      id,
      body.filename ?? 'image.jpg',
      body.contentType ?? 'image/jpeg',
      3600, // 1 hour to upload
    );
    return { success: true, data: result };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SSE — Real-time events
  // ══════════════════════════════════════════════════════════════════════════

  // GET /api/v1/webinars/join/:code/events
  // Attendee connects → gets live SSE stream (no auth needed)
  @Get('join/:code/events')
  async streamEvents(
    @Param('code') code: string,
    @Query('name') displayName: string,
    @Res() reply: FastifyReply,
  ) {
    const webinar = await this.webinarsService.findByJoinCode(code);

    // SSE headers
    void reply.raw.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx buffering
    });

    const clientId = uuidv4();
    const name     = displayName?.trim() || 'Viewer';

    const write = (event: { type: string; data: Record<string, unknown>; timestamp: number }) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\nid: ${event.timestamp}\n\n`);
    };

    const close = () => { try { reply.raw.end(); } catch {} };

    // Send initial connection event
    write({
      type: 'connected',
      data: { clientId, webinarTitle: webinar.title, viewerCount: this.sse.getViewerCount(webinar.id) + 1 },
      timestamp: Date.now(),
    });

    const joinedAtTime = Date.now();
    this.sse.addClient(webinar.id, { id: clientId, displayName: name, joinedAt: joinedAtTime, write, close });

    // Track join on database
    await this.webinarsService.trackJoin(webinar.id, clientId, name);

    // Notify all that viewer count changed
    this.sse.broadcast(webinar.id, {
      type: 'viewer_count',
      data: { count: this.sse.getViewerCount(webinar.id) },
    });

    // Heartbeat every 25s (keeps connection alive through proxies)
    const heartbeat = setInterval(() => {
      try { reply.raw.write(': heartbeat\n\n'); }
      catch { clearInterval(heartbeat); }
    }, 25000);

    // Cleanup on disconnect
    reply.raw.on('close', async () => {
      clearInterval(heartbeat);
      this.sse.removeClient(webinar.id, clientId);
      
      // Calculate watch duration
      const durationSeconds = Math.floor((Date.now() - joinedAtTime) / 1000);
      try {
        await this.webinarsService.updateAttendeeDuration(webinar.id, clientId, durationSeconds);
      } catch (err) {
        console.error('Failed to update attendee duration:', err);
      }

      // Broadcast updated viewer count
      this.sse.broadcast(webinar.id, {
        type: 'viewer_count',
        data: { count: this.sse.getViewerCount(webinar.id) },
      });
    });
  }


  // POST /api/v1/webinars/:id/broadcast  (host only)
  // Host sends any event → broadcast to all connected attendees
  @Post(':id/broadcast')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async broadcast(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { type: string; data: Record<string, unknown> },
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const sent = this.sse.broadcast(id, { type: body.type, data: body.data ?? {} });
    return { success: true, data: { sent } };
  }

  // POST /api/v1/webinars/join/:code/chat  (public — attendee sends chat)
  // Broadcasts chat message to all attendees in the room
  @Post('join/:code/chat')
  @HttpCode(HttpStatus.OK)
  async attendeeChat(
    @Param('code') code: string,
    @Body() body: { displayName: string; message: string },
  ) {
    const webinar = await this.webinarsService.findByJoinCode(code);
    const sent = this.sse.broadcast(webinar.id, {
      type: 'chat',
      data: {
        user:    body.displayName?.trim() || 'Viewer',
        message: String(body.message ?? '').substring(0, 500),
        time:    new Date().toISOString(),
      },
    });
    return { success: true, data: { sent } };
  }

  // GET /api/v1/webinars/:id/viewers  (host — live viewer list)
  @Get(':id/viewers')
  @UseGuards(JwtAuthGuard)
  async getViewers(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.webinarsService.findOne(id, user.userId, user.orgId ?? null);
    const viewers = this.sse.getViewers(id);
    return { success: true, data: { viewers, count: viewers.length } };
  }

  // ── Start Instantly: create + go live in one call ─────────────────────────
  @Post('start-now')
  @UseGuards(JwtAuthGuard)
  async startNow(
    @Body() dto: CreateWebinarDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const webinar = await this.webinarsService.createAndGoLive(
      dto,
      user.userId,
      user.orgId ?? null,
    );
    return { success: true, data: webinar };
  }

}



