/** Clés de permission alignées sur les modules du menu admin. */
export const ADMIN_PERMISSION_KEYS = [
  'dashboard',
  'reservations',
  'clients',
  'invoices',
  'vehicles',
  'apartments',
  'hero',
  'partners',
  'gift_cards',
  'promo_codes',
  'contact_messages',
  'notifications',
  'newsletter',
  'incidents',
  'settings',
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSION_KEYS)[number];

/** Permission réservée à l’Admin — jamais assignable à un Commercial. */
export const USERS_PERMISSION = 'users' as const;

export const STAFF_ROLES = ['ADMIN', 'MANAGER', 'COMMERCIAL'] as const;

export function isStaffRole(role?: string | null): boolean {
  return !!role && (STAFF_ROLES as readonly string[]).includes(role);
}

/**
 * ADMIN → tout ; MANAGER → tout sauf users ; COMMERCIAL → permissions[] ;
 * autres rôles → false.
 */
export function hasPermission(
  user: { role?: string; permissions?: string[] } | null | undefined,
  key: string,
): boolean {
  if (!user?.role) return false;
  if (user.role === 'ADMIN') return true;
  if (user.role === 'MANAGER') return key !== USERS_PERMISSION;
  if (user.role === 'COMMERCIAL') {
    return Array.isArray(user.permissions) && user.permissions.includes(key);
  }
  return false;
}

export function canAccessAdminSpace(user: { role?: string } | null | undefined): boolean {
  return isStaffRole(user?.role);
}

/** Nettoie et restreint la liste (retire `users`, clés inconnues, doublons). */
export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const allowed = new Set<string>(ADMIN_PERMISSION_KEYS);
  const out: string[] = [];
  for (const raw of input) {
    if (typeof raw !== 'string') continue;
    const key = raw.trim();
    if (!allowed.has(key) || out.includes(key)) continue;
    out.push(key);
  }
  return out;
}
