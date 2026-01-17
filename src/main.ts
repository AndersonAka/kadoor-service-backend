import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configuration CORS
  app.enableCors({
    origin: true,
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

  // Configuration Swagger
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

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3001}`);
  console.log(`Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
}
bootstrap();
