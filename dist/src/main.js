"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const swagger_1 = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: true,
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(process.env.PORT ?? 3001);
    console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3001}`);
    console.log(`Swagger documentation: http://localhost:${process.env.PORT ?? 3001}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map