import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AdminInvoicesController } from './admin-invoices.controller';

@Module({
  imports: [ConfigModule, PrismaModule, ReservationsModule],
  providers: [InvoicesService],
  controllers: [InvoicesController, AdminInvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
