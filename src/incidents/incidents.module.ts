import { Module } from '@nestjs/common';
import { IncidentsService } from './incidents.service';
import { IncidentsController } from './incidents.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ApartmentsModule } from '../apartments/apartments.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, EmailModule, VehiclesModule, ApartmentsModule, AuthModule],
  providers: [IncidentsService],
  controllers: [IncidentsController],
  exports: [IncidentsService],
})
export class IncidentsModule {}
