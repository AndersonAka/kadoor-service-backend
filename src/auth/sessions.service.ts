'use strict';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  STAFF_ACTIVITY_TOUCH_THROTTLE_MS,
  STAFF_IDLE_MS,
  summarizeUserAgent,
} from './session.constants';

export type SessionMeta = {
  userAgent?: string | null;
  ip?: string | null;
};

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findActiveSession(userId: string) {
    const session = await this.prisma.userSession.findFirst({
      where: { userId, revokedAt: null },
      orderBy: { lastActivityAt: 'desc' },
    });
    if (!session) return null;

    if (this.isIdle(session.lastActivityAt)) {
      await this.revokeSession(session.id, 'IDLE');
      return null;
    }
    return session;
  }

  describeSession(session: {
    id: string;
    userAgent: string | null;
    ip: string | null;
    createdAt: Date;
    lastActivityAt: Date;
  }) {
    return {
      id: session.id,
      browser: summarizeUserAgent(session.userAgent),
      ip: session.ip,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
    };
  }

  async revokeAllForUser(userId: string, reason: string) {
    await this.prisma.userSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async revokeSession(sessionId: string, reason: string) {
    await this.prisma.userSession.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date(), revokeReason: reason },
    });
  }

  async createSession(userId: string, meta: SessionMeta) {
    return this.prisma.userSession.create({
      data: {
        userId,
        userAgent: meta.userAgent?.slice(0, 512) || null,
        ip: meta.ip?.slice(0, 64) || null,
      },
    });
  }

  /**
   * Crée une session staff exclusive. Si `force`, révoque les sessions existantes.
   * Sinon retourne `{ conflict: true, existing }` si une session active existe.
   */
  async openExclusiveSession(
    userId: string,
    meta: SessionMeta,
    force: boolean,
  ): Promise<
    | { conflict: true; existing: ReturnType<SessionsService['describeSession']> }
    | { conflict: false; session: { id: string } }
  > {
    const existing = await this.findActiveSession(userId);
    if (existing && !force) {
      return { conflict: true, existing: this.describeSession(existing) };
    }
    if (existing && force) {
      await this.revokeAllForUser(userId, 'TAKEOVER');
    }
    const session = await this.createSession(userId, meta);
    return { conflict: false, session };
  }

  private isIdle(lastActivityAt: Date) {
    return Date.now() - new Date(lastActivityAt).getTime() > STAFF_IDLE_MS;
  }

  /**
   * Valide la session JWT staff et met à jour lastActivityAt (throttlé).
   */
  async assertActiveAndTouch(sessionId: string, userId: string) {
    let session: {
      id: string;
      userId: string;
      lastActivityAt: Date;
      revokedAt: Date | null;
      revokeReason: string | null;
    } | null;

    try {
      session = await this.prisma.userSession.findUnique({
        where: { id: sessionId },
      });
    } catch (err: any) {
      // Table absente (migration non déployée) → ne pas faire tomber l'API (502)
      if (err?.code === 'P2021' || /UserSession/i.test(String(err?.message || ''))) {
        throw new UnauthorizedException({
          code: 'SESSION_REQUIRED',
          message: 'Session staff indisponible. Redéployez les migrations puis reconnectez-vous.',
        });
      }
      throw err;
    }

    if (!session || session.userId !== userId) {
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Session invalide. Veuillez vous reconnecter.',
      });
    }

    if (session.revokedAt) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message:
          session.revokeReason === 'TAKEOVER'
            ? 'Votre session a été fermée car une connexion a été ouverte ailleurs.'
            : 'Session terminée. Veuillez vous reconnecter.',
      });
    }

    if (this.isIdle(session.lastActivityAt)) {
      await this.revokeSession(session.id, 'IDLE');
      throw new UnauthorizedException({
        code: 'SESSION_IDLE',
        message: 'Déconnexion pour inactivité (30 minutes).',
      });
    }

    const elapsed = Date.now() - new Date(session.lastActivityAt).getTime();
    if (elapsed >= STAFF_ACTIVITY_TOUCH_THROTTLE_MS) {
      await this.prisma.userSession.update({
        where: { id: session.id },
        data: { lastActivityAt: new Date() },
      });
    }

    return session;
  }

  /** Ping explicite « rester connecté » depuis le modal d’avertissement. */
  async touch(sessionId: string, userId: string) {
    return this.assertActiveAndTouch(sessionId, userId);
  }
}
