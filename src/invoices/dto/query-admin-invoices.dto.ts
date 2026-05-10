import { IsEnum, IsOptional } from 'class-validator';
import { InvoiceStatus } from '@prisma/client';

/**
 * DTO de requête pour `GET /admin/invoices`.
 *
 * Le type `InvoiceStatus` issu de `@prisma/client` est un objet enum runtime
 * qui ne s'introspecte pas correctement quand on l'utilise directement comme
 * type d'un paramètre `@Query(...)` (Swagger détecte alors une « dépendance
 * circulaire » au démarrage). Encapsuler le filtre dans un DTO + `@IsEnum`
 * résout le problème tout en gardant la validation.
 */
export class QueryAdminInvoicesDto {
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
