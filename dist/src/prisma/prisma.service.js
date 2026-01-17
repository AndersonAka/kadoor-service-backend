"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var PrismaService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
let PrismaService = PrismaService_1 = class PrismaService extends client_1.PrismaClient {
    configService;
    logger;
    constructor(configService) {
        try {
            console.log('[PrismaService] Initialisation de PrismaService (PostgreSQL) avec Driver Adapter...');
            if (!configService) {
                const error = new Error('ConfigService n\'est pas disponible lors de l\'initialisation de PrismaService');
                console.error('[PrismaService]', error.message);
                throw error;
            }
            const databaseUrl = configService.get('DATABASE_URL');
            if (!databaseUrl) {
                const error = new Error('DATABASE_URL n\'est pas défini dans les variables d\'environnement.');
                console.error('[PrismaService]', error.message);
                throw error;
            }
            if (!databaseUrl.startsWith('postgresql://') && !databaseUrl.startsWith('postgres://')) {
                const error = new Error(`Format de DATABASE_URL invalide pour PostgreSQL. Reçu: ${databaseUrl.substring(0, 50)}...`);
                console.error('[PrismaService]', error.message);
                throw error;
            }
            console.log(`[PrismaService] DATABASE_URL validée. Connexion à: ${PrismaService_1.maskPassword(databaseUrl)}`);
            const pool = new pg_1.Pool({ connectionString: databaseUrl });
            const adapter = new adapter_pg_1.PrismaPg(pool);
            super({
                adapter,
                log: ['query', 'info', 'warn', 'error'],
            });
            this.configService = configService;
            this.logger = new common_1.Logger(PrismaService_1.name);
            this.logger.log('PrismaClient initialisé avec Driver Adapter PG');
        }
        catch (error) {
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
        }
        catch (error) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.logger.error(`Erreur lors de la déconnexion: ${errorMessage}`);
        }
    }
    static maskPassword(url) {
        let masked = url.replace(/:([^:@]+)@/, ':****@');
        return masked;
    }
};
exports.PrismaService = PrismaService;
exports.PrismaService = PrismaService = PrismaService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], PrismaService);
//# sourceMappingURL=prisma.service.js.map