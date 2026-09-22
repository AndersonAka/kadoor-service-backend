import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ListingModerationService } from './listing-moderation.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [ListingModerationService],
  exports: [ListingModerationService],
})
export class ListingsModule {}
