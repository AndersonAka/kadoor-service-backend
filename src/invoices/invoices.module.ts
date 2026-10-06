import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { GeniusPayModule } from '../payments/providers/geniuspay/geniuspay.module';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { AdminInvoicesController } from './admin-invoices.controller';

@Module({
  imports: [ConfigModule, PrismaModule, GeniusPayModule],
  providers: [InvoicesService],
  controllers: [InvoicesController, AdminInvoicesController],
  exports: [InvoicesService],
})
export class InvoicesModule {}
