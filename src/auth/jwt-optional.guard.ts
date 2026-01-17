import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard JWT optionnel : n'échoue pas si le token est absent
 * Permet aux endpoints d'accepter les requêtes avec ou sans authentification
 */
@Injectable()
export class JwtOptionalGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    // Si l'utilisateur n'est pas authentifié, retourner undefined au lieu de lancer une erreur
    return user || undefined;
  }
}
