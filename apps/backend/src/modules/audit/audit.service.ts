import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuditLog } from './entities/audit-log.entity';

export interface AuditLogEntry {
  action: string;
  resourceType: string;
  resourceId?: string;
  actorId?: string;
  actorEmail?: string;
  actorIp?: string;
  orgId?: string;
  beforeState?: unknown;
  afterState?: unknown;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const record = this.auditLogRepository.create({
        action: entry.action,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId ?? null,
        actorId: entry.actorId ?? null,
        actorEmail: entry.actorEmail ?? null,
        actorIp: entry.actorIp ?? null,
        orgId: entry.orgId ?? null,
        beforeState: entry.beforeState ?? null,
        afterState: entry.afterState ?? null,
        metadata: entry.metadata ?? {},
      });

      await this.auditLogRepository.save(record);
    } catch (error) {
      // Audit failures must NOT cause the main operation to fail
      // Log to console but swallow the error
      console.error('[AuditService] Failed to write audit log:', error);
    }
  }

  async findAll(query: {
    orgId?: string;
    actorId?: string;
    action?: string;
    resourceType?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: AuditLog[]; total: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const qb = this.auditLogRepository
      .createQueryBuilder('al')
      .orderBy('al.created_at', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.orgId) qb.andWhere('al.org_id = :orgId', { orgId: query.orgId });
    if (query.actorId) qb.andWhere('al.actor_id = :actorId', { actorId: query.actorId });
    if (query.action) qb.andWhere('al.action = :action', { action: query.action });
    if (query.resourceType) {
      qb.andWhere('al.resource_type = :resourceType', { resourceType: query.resourceType });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }
}
