import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap, catchError } from 'rxjs';
import { throwError } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { AuditService } from './audit.service';
import { AUDITED_KEY } from './audit.decorator';
import { AuditedMeta } from './audit.types';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function clientIp(req: any): string | null {
  const xf = req.headers?.['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

function deriveAction(method: string, route: string): string {
  const path = (route || '').replace(/^\/+/, '').replace(/\//g, '.') || 'unknown';
  return `${method.toLowerCase()}.${path}`;
}

function deriveEntityType(route: string, meta?: AuditedMeta): string {
  if (meta?.entityType) return meta.entityType;
  const parts = (route || '').split('/').filter(Boolean);
  // admin/vehicles/:id → Vehicle ; partners → Partner
  const idx = parts[0] === 'admin' ? 1 : 0;
  const raw = parts[idx] || 'Unknown';
  const singular = raw.replace(/-/g, '_').replace(/s$/, '');
  return singular.charAt(0).toUpperCase() + singular.slice(1);
}

function extractEntityId(req: any, meta?: AuditedMeta): string | null {
  const param = meta?.entityIdParam || 'id';
  return req.params?.[param] || req.body?.id || null;
}

function isStaffRequest(req: any): boolean {
  const role = req.user?.role;
  return role === 'ADMIN' || role === 'MANAGER' || role === 'COMMERCIAL';
}

function looksLikeStaffRoute(url: string): boolean {
  const path = (url || '').split('?')[0];
  return (
    path.startsWith('/admin') ||
    path.startsWith('/partners') ||
    path.startsWith('/promo-codes') ||
    path.startsWith('/settings') ||
    path.startsWith('/hero') ||
    path.startsWith('/contact') ||
    path.startsWith('/gift-cards') ||
    path.startsWith('/notifications/admin') ||
    (path.startsWith('/invoices') && !path.includes('/me'))
  );
}

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly audit: AuditService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const method = (req.method || '').toUpperCase();
    if (!MUTATING.has(method)) return next.handle();

    const url: string = req.originalUrl || req.url || '';
    // Ne journaliser via intercepteur que le trafic staff back-office
    if (!isStaffRequest(req) && !looksLikeStaffRoute(url)) {
      return next.handle();
    }
    // Éviter double-log sur le webhook public
    if (url.includes('/payments/geniuspay/notify')) {
      return next.handle();
    }

    const meta = this.reflector.getAllAndOverride<AuditedMeta | undefined>(AUDITED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const route = (req.route?.path ? `${req.baseUrl || ''}${req.route.path}` : url.split('?')[0]) || url;
    const action = meta?.action || deriveAction(method, route);
    const entityType = deriveEntityType(route, meta);
    const requestId = (req.headers?.['x-request-id'] as string) || uuidv4();
    const actorId = req.user?.id || req.user?.userId || null;
    const actorEmail = req.user?.email || null;
    const actorRole = req.user?.role || null;
    const source = url.startsWith('/admin') || isStaffRequest(req) ? 'ADMIN_UI' : 'API';

    const bodySnapshot = this.audit.sanitize(
      method === 'GET' ? undefined : { ...(req.body || {}), ...(req.params || {}) },
    );

    return next.handle().pipe(
      tap((result) => {
        const entityId =
          extractEntityId(req, meta) ||
          result?.id ||
          result?.booking?.id ||
          result?.card?.id ||
          result?.batch?.id ||
          result?.invoice?.id ||
          null;

        void this.audit.record({
          actorId,
          actorEmail,
          actorRole,
          action,
          entityType,
          entityId: entityId ? String(entityId) : null,
          outcome: 'SUCCESS',
          httpMethod: method,
          route,
          ipAddress: clientIp(req),
          userAgent: req.headers?.['user-agent'] || null,
          requestId,
          summary: `${method} ${route}`,
          after: bodySnapshot,
          metadata: { responseHint: result?.status || result?.message || undefined },
          source: source as any,
        });
      }),
      catchError((err) => {
        void this.audit.record({
          actorId,
          actorEmail,
          actorRole,
          action,
          entityType,
          entityId: extractEntityId(req, meta),
          outcome: err?.status === 403 ? 'DENIED' : 'FAILURE',
          httpMethod: method,
          route,
          ipAddress: clientIp(req),
          userAgent: req.headers?.['user-agent'] || null,
          requestId,
          summary: `${method} ${route} — ${err?.message || 'error'}`,
          after: bodySnapshot,
          metadata: { statusCode: err?.status || 500 },
          source: source as any,
        });
        return throwError(() => err);
      }),
    );
  }
}
