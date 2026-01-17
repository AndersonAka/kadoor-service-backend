import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private logger: Logger;

  constructor(private configService: ConfigService) {
    try {
      console.log('[PrismaService] Initialisation de PrismaService (PostgreSQL) avec Driver Adapter...');
      
      // Vérifier que ConfigService est disponible
      if (!configService) {
        const error = new Error('ConfigService n\'est pas disponible lors de l\'initialisation de PrismaService');
        console.error('[PrismaService]', error.message);
        throw error;
      }

      const databaseUrl = configService.get<string>('DATABASE_URL');
      
      // Valider que DATABASE_URL est défini
      if (!databaseUrl) {
        const error = new Error(
          'DATABASE_URL n\'est pas défini dans les variables d\'environnement.'
        );
        console.error('[PrismaService]', error.message);
        throw error;
      }

      // Valider le format de l'URL (doit commencer par postgresql:// ou postgres://)
      if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
        const error = new Error(
          `Format de DATABASE_URL invalide pour PostgreSQL. Reçu: ${databaseUrl.substring(0, 50)}...`
        );
        console.error('[PrismaService]', error.message);
        throw error;
      }
      
      console.log(`[PrismaService] DATABASE_URL validée. Connexion à: ${PrismaService.maskPassword(databaseUrl)}`);
      
      // Configuration de l'adapter pour Prisma 7
      const pool = new Pool({ connectionString: databaseUrl });
      const adapter = new PrismaPg(pool);

      // Initialisation du PrismaClient avec l'adapter
      super({
        adapter,
        log: ['query', 'info', 'warn', 'error'],
      });

      // Initialiser le logger après super()
      this.logger = new Logger(PrismaService.name);
      this.logger.log('PrismaClient initialisé avec Driver Adapter PG');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[PrismaService] Erreur fatale lors de l\'initialisation:', errorMessage);
      throw error;
    }
  }

  async onModuleInit() {
    try {
      this.logger.log('Connexion à la base de données PostgreSQL via adapter...');
      await this.$connect();
      this.logger.log('Connexion établie avec succès');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erreur lors de la connexion à la base de données: ${errorMessage}`);
      throw error;
    }
  }

  async onModuleDestroy() {
    try {
      this.logger.log('Déconnexion de la base de données...');
      await this.$disconnect();
      this.logger.log('Déconnexion réussie');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Erreur lors de la déconnexion: ${errorMessage}`);
    }
  }

  /**
   * Masque le mot de passe dans l'URL pour les logs
   */
  private static maskPassword(url: string): string {
    // Masquer le mot de passe dans le format user:password@
    let masked = url.replace(/:([^:@]+)@/, ':****@');
    return masked;
  }
}