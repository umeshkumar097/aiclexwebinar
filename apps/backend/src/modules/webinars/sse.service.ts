import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Subject } from 'rxjs';

export interface SseEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

interface RoomClient {
  id: string;
  displayName: string;
  joinedAt: number;
  write: (event: SseEvent) => void;
  close: () => void;
}

@Injectable()
export class SseService implements OnModuleDestroy {
  private readonly logger = new Logger(SseService.name);

  // webinarId → Map<clientId, RoomClient>
  private readonly rooms = new Map<string, Map<string, RoomClient>>();

  // ── Register a new SSE client ────────────────────────────────────────────
  addClient(webinarId: string, client: RoomClient): void {
    if (!this.rooms.has(webinarId)) {
      this.rooms.set(webinarId, new Map());
    }
    this.rooms.get(webinarId)!.set(client.id, client);
    this.logger.log(`[SSE] Client joined  webinar=${webinarId} client=${client.id} name=${client.displayName}`);
    this.logger.log(`[SSE] Room size=${this.rooms.get(webinarId)!.size}`);
  }

  // ── Remove a client ──────────────────────────────────────────────────────
  removeClient(webinarId: string, clientId: string): void {
    const room = this.rooms.get(webinarId);
    if (room) {
      room.delete(clientId);
      this.logger.log(`[SSE] Client left    webinar=${webinarId} client=${clientId} size=${room.size}`);
      if (room.size === 0) this.rooms.delete(webinarId);
    }
  }

  // ── Broadcast to all clients in a room ───────────────────────────────────
  broadcast(webinarId: string, event: Omit<SseEvent, 'timestamp'>): number {
    const room = this.rooms.get(webinarId);
    if (!room || room.size === 0) return 0;

    const full: SseEvent = { ...event, timestamp: Date.now() };
    let sent = 0;
    for (const client of room.values()) {
      try {
        client.write(full);
        sent++;
      } catch (err) {
        this.logger.warn(`[SSE] Failed to write to client=${client.id}: ${String(err)}`);
        this.removeClient(webinarId, client.id);
      }
    }
    this.logger.log(`[SSE] Broadcast type=${event.type} webinar=${webinarId} sent=${sent}`);
    return sent;
  }

  // ── Get viewer list for host ─────────────────────────────────────────────
  getViewers(webinarId: string): { id: string; displayName: string; joinedAt: number }[] {
    const room = this.rooms.get(webinarId);
    if (!room) return [];
    return [...room.values()].map((c) => ({
      id: c.id,
      displayName: c.displayName,
      joinedAt: c.joinedAt,
    }));
  }

  // ── Viewer count ─────────────────────────────────────────────────────────
  getViewerCount(webinarId: string): number {
    return this.rooms.get(webinarId)?.size ?? 0;
  }

  // ── Cleanup all rooms on shutdown ────────────────────────────────────────
  onModuleDestroy(): void {
    for (const [wid, room] of this.rooms.entries()) {
      for (const client of room.values()) {
        try { client.close(); } catch {}
      }
      this.rooms.delete(wid);
    }
  }
}
