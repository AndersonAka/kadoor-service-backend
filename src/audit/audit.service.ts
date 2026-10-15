import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditRecordInput, AuditOutcome } from './audit.types';
import { v4 as uuidv4 } from 'uuid';

const SENSITIVE_KEYS = new Set([
  'password',
  'merchantpassword',
  'currentpassword',
  'newpassword',
  'confirmpassword',
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
  'apisecret',
  'webhooksecret',
  'paystacksecret',
  'geniuspay',
]);

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Masque récursivement les champs sensibles. */
  sanitize(value: unknown, depth = 0): unknown {
    if (value == null || depth > 6) return value;
    if (Array.isArray(value)) {
      return value.slice(0, 50).map((v) => this.sanitize(v, depth + 1));
    }
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(k.toLowerCase().replace(/[_-]/g, ''))) {
          out[k] = '[REDACTED]';
        } else {
          out[k] = this.sanitize(v, depth + 1);
        }
      }
      return out;
    }
    if (typeof value === 'string' && value.length > 2000) {
      return `${value.slice(0, 2000)}…`;
    }
    return value;
  }

  toJson(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (value === undefined) return undefined;
    if (value === null) return Prisma.JsonNull;
    return this.sanitize(value) as Prisma.InputJsonValue;
  }

  /**
   * Écriture append-only best-effort : n’interrompt jamais le flux métier.
   */
  async record(input: AuditRecordInput): Promise<void> {
    try {
      const outcome: AuditOutcome = input.outcome || 'SUCCESS';
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId || null,
          actorEmail: input.actorEmail || null,
          actorRole: input.actorRole || null,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId || null,
          outcome,
          httpMethod: input.httpMethod || null,
          route: input.route || null,
          ipAddress: input.ipAddress || null,
          userAgent: input.userAgent || null,
          requestId: input.requestId || uuidv4(),
          summary: input.summary || null,
          before: this.toJson(input.before) as any,
          after: this.toJson(input.after) as any,
          metadata: this.toJson(input.metadata ?? undefined) as any,
          source: input.source || 'API',
        },
      });
    } catch (err: any) {
      this.logger.error(`AuditLog write failed: ${err?.message || err}`);
    }
  }

  async findMany(query: {
    page?: number;
    limit?: number;
    actorId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    outcome?: string;
    source?: string;
    from?: string;
    to?: string;
  }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const skip = (page - 1) * limit;

    const where: Prisma.AuditLogWhereInput = {};
    if (query.actorId) where.actorId = query.actorId;
    if (query.action) where.action = { contains: query.action, mode: 'insensitive' };
    if (query.entityType) where.entityType = query.entityType;
    if (query.entityId) where.entityId = query.entityId;
    if (query.outcome) where.outcome = query.outcome;
    if (query.source) where.source = query.source;
    if (query.from || query.to) {
      where.createdAt = {};
      if (query.from) where.createdAt.gte = new Date(query.from);
      if (query.to) where.createdAt.lte = new Date(query.to);
    }

    const [data, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findOne(id: string) {
    return this.prisma.auditLog.findUnique({ where: { id } });
  }
}
