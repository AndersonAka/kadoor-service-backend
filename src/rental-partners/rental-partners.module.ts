import { Module } from '@nestjs/common';
import { RentalPartnersController } from './rental-partners.controller';
import { RentalPartnersService } from './rental-partners.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RentalPartnersController],
  providers: [RentalPartnersService],
})
export class RentalPartnersModule {}
