import { Module, forwardRef } from '@nestjs/common';
import { GeniusPayModule } from './providers/geniuspay/geniuspay.module';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ReservationsModule } from '../reservations/reservations.module';
import { GiftCardsModule } from '../gift-cards/gift-cards.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    GeniusPayModule,
    PrismaModule,
    forwardRef(() => ReservationsModule),
    forwardRef(() => GiftCardsModule),
    forwardRef(() => InvoicesModule),
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
