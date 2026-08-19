import { Module } from '@nestjs/common';
import { RentalPartnersController } from './rental-partners.controller';
import { RentalPartnersService } from './rental-partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { VehiclesModule } from '../vehicles/vehicles.module';
import { ApartmentsModule } from '../apartments/apartments.module';

@Module({
  imports: [PrismaModule, VehiclesModule, ApartmentsModule],
  controllers: [RentalPartnersController],
  providers: [RentalPartnersService],
})
export class RentalPartnersModule {}
