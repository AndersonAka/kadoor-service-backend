import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ReservationsService } from './reservations.service';
import { ReservationsController } from './reservations.controller';
import { PaystackService } from './paystack.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ApartmentsModule } from '../apartments/apartments.module';
import { DocumentsModule } from '../documents/documents.module';
import { EmailModule } from '../email/email.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [ConfigModule, PrismaModule, VehiclesModule, ApartmentsModule, DocumentsModule, EmailModule, AuthModule],
  providers: [ReservationsService, PaystackService],
  controllers: [ReservationsController],
  exports: [ReservationsService],
})
export class ReservationsModule {}
