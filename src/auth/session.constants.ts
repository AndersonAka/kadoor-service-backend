'use strict';

/** Rôles soumis à session unique + idle timeout. */
export const STAFF_SESSION_ROLES = ['ADMIN', 'MANAGER', 'COMMERCIAL'] as const;

export type StaffSessionRole = (typeof STAFF_SESSION_ROLES)[number];

/** Inactivité max avant invalidation serveur (30 min). */
export const STAFF_IDLE_MS = 30 * 60 * 1000;

/** Ne pas écrire lastActivityAt plus souvent que ça (charge DB). */
export const STAFF_ACTIVITY_TOUCH_THROTTLE_MS = 60 * 1000;

/** TTL JWT staff (plus court que les 24 h clients). */
export const STAFF_JWT_EXPIRES_IN = '8h';

export function isStaffSessionRole(role: string | null | undefined): boolean {
  return !!role && (STAFF_SESSION_ROLES as readonly string[]).includes(role);
}

export function summarizeUserAgent(ua?: string | null): string {
  if (!ua) return 'Navigateur inconnu';
  if (/Edg\//i.test(ua)) return 'Microsoft Edge';
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return 'Google Chrome';
  if (/Firefox\//i.test(ua)) return 'Mozilla Firefox';
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return 'Safari';
  return 'Navigateur';
}
