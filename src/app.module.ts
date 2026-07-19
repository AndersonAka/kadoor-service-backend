import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
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
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SettingsModule } from './settings/settings.module';
import { ContactModule } from './contact/contact.module';
import { PromoCodesModule } from './promo-codes/promo-codes.module';
import { InvoicesModule } from './invoices/invoices.module';
import { PartnersModule } from './partners/partners.module';
import { GiftCardsModule } from './gift-cards/gift-cards.module';
import { MerchantModule } from './merchant/merchant.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        // Limite globale par défaut : filet de sécurité de base sur toute l'API
        ttl: 60000,
        limit: 100,
      },
    ]),
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
    FavoritesModule,
    NotificationsModule,
    SettingsModule,
    ContactModule,
    PromoCodesModule,
    InvoicesModule,
    PartnersModule,
    GiftCardsModule,
    MerchantModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
