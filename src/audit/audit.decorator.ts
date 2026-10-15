import { SetMetadata } from '@nestjs/common';
import { AuditedMeta } from './audit.types';

export const AUDITED_KEY = 'audited';

/** Annoter une méthode de contrôleur pour enrichir le journal d’audit. */
export const Audited = (meta: AuditedMeta) => SetMetadata(AUDITED_KEY, meta);
