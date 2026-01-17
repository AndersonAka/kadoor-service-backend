import { Module } from '@nestjs/common';
import { HeroService } from './hero.service';
import { HeroController } from './hero.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [HeroController],
  providers: [HeroService],
})
export class HeroModule {}
