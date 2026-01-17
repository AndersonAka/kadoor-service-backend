import { Module } from '@nestjs/common';
import { ApartmentsService } from './apartments.service';
import { ApartmentsController } from './apartments.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ApartmentsController],
  providers: [ApartmentsService],
  exports: [ApartmentsService],
})
export class ApartmentsModule {}
