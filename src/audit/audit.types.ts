export type AuditOutcome = 'SUCCESS' | 'FAILURE' | 'DENIED';
export type AuditSource = 'ADMIN_UI' | 'API' | 'WEBHOOK' | 'SYSTEM';

export interface AuditRecordInput {
  actorId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  outcome?: AuditOutcome;
  httpMethod?: string | null;
  route?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  summary?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown> | null;
  source?: AuditSource;
}

export interface AuditedMeta {
  action: string;
  entityType: string;
  /** Nom du paramètre de route contenant l’id (défaut: id) */
  entityIdParam?: string;
}
