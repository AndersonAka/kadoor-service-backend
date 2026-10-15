import { Global, Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { AdminAuditController } from './admin-audit.controller';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
  controllers: [AdminAuditController],
  exports: [AuditService],
})
export class AuditModule {}
