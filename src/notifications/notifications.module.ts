import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { OneSignalService } from './onesignal.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [ConfigModule, PrismaModule],
  providers: [NotificationsService, OneSignalService],
  exports: [NotificationsService, OneSignalService],
})
export class NotificationsModule {}
