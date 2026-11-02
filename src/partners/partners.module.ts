import { Module } from '@nestjs/common';
import { PartnersController } from './partners.controller';
import { PartnersPublicController } from './partners-public.controller';
import { PartnersService } from './partners.service';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, EmailModule, NotificationsModule],
  controllers: [PartnersController, PartnersPublicController],
  providers: [PartnersService],
  exports: [PartnersService],
})
export class PartnersModule {}
