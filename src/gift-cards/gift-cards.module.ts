import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GiftCardsController } from './gift-cards.controller';
import { GiftCardsService } from './gift-cards.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { GeniusPayModule } from '../payments/providers/geniuspay/geniuspay.module';

@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, GeniusPayModule],
  controllers: [GiftCardsController],
  providers: [GiftCardsService],
  exports: [GiftCardsService],
})
export class GiftCardsModule {}
