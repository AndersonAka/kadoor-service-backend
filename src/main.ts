// Doit être le tout premier import : garantit que process.env est peuplé
// avant l'évaluation des modules important JwtStrategy (qui lit process.env.JWT_SECRET
// au chargement, avant que ConfigModule.forRoot() n'ait pu tourner).
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';

const isProd = process.env.NODE_ENV === 'production';

// Liste blanche des origines CORS : FRONTEND_URL + éventuels domaines
// supplémentaires (CORS_EXTRA_ORIGINS="https://a.com,https://b.com"), + localhost en dev.
function buildAllowedOrigins(): string[] {
  const origins = new Set<string>();
  if (process.env.FRONTEND_URL) origins.add(process.env.FRONTEND_URL.trim());
  if (process.env.CORS_EXTRA_ORIGINS) {
    process.env.CORS_EXTRA_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean).forEach((o) => origins.add(o));
  }
  if (!isProd) origins.add('http://localhost:3000');
  return Array.from(origins);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });

  // Headers de sécurité (CSP désactivée hors prod pour ne pas bloquer Swagger UI,
  // qui n'est de toute façon monté qu'en dev/staging — voir plus bas)
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
    }),
  );

  // Nécessaire pour lire le cookie httpOnly contenant le JWT (voir jwt.strategy.ts)
  app.use(cookieParser());

  // Compresse les réponses (gzip) — réduit la bande passante et la latence perçue
  // sous forte charge, notamment sur les listes JSON volumineuses.
  app.use(compression());

  // Permet à PrismaService.onModuleDestroy() (et autres hooks) de fermer proprement
  // les connexions DB lors d'un arrêt/redémarrage PM2 (SIGTERM), plutôt que de couper
  // les requêtes en cours brutalement.
  app.enableShutdownHooks();

  // Configuration CORS — liste blanche explicite en production
  const allowedOrigins = buildAllowedOrigins();
  app.enableCors({
    origin: isProd ? allowedOrigins : true,
    credentials: true,
  });

  // Validation globale
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Permettre les propriétés supplémentaires pour éviter les erreurs 401
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Documentation Swagger : uniquement hors production (expose sinon la carte
  // complète des routes de l'API à n'importe quel visiteur)
  if (!isProd) {
    const config = new DocumentBuilder()
      .setTitle('KADOOR SERVICE API')
      .setDescription('API pour la plateforme de location de véhicules, appartements et chèques cadeaux')
      .setVersion('1.0')
      .addTag('vehicles', 'Gestion des véhicules')
      .addTag('apartments', 'Gestion des appartements')
      .addTag('reservations', 'Gestion des réservations')
      .addTag('documents', 'Génération de documents PDF')
      .addTag('auth', 'Authentification')
      .addTag('users', 'Gestion des utilisateurs')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3001}`);
  if (!isProd) {
    console.log(`Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
  }
}
bootstrap();
