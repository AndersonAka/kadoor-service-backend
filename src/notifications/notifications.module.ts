import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { OneSignalService } from './onesignal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, OneSignalService],
  exports: [NotificationsService, OneSignalService],
})
export class NotificationsModule {}
