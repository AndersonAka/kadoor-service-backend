import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GeniusPayService } from './geniuspay.service';

@Module({
  imports: [ConfigModule],
  providers: [GeniusPayService],
  exports: [GeniusPayService],
})
export class GeniusPayModule {}
