import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { HeroModule } from './hero/hero.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { ApartmentsModule } from './apartments/apartments.module';
import { ReservationsModule } from './reservations/reservations.module';
import { EmailModule } from './email/email.module';
import { DocumentsModule } from './documents/documents.module';
import { AdminModule } from './admin/admin.module';
import { ReviewsModule } from './reviews/reviews.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { IncidentsModule } from './incidents/incidents.module';
import { TestimonialsModule } from './testimonials/testimonials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    PrismaModule,
    HeroModule,
    VehiclesModule,
    ApartmentsModule,
    ReservationsModule,
    DocumentsModule,
    AdminModule,
    EmailModule,
    ReviewsModule,
    NewsletterModule,
    IncidentsModule,
    TestimonialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
