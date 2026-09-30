import { Injectable } from '@nestjs/common';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HeroService {
  constructor(private readonly prisma: PrismaService) {}

  create(createHeroDto: CreateHeroDto) {
    return this.prisma.heroSlide.create({
      data: createHeroDto,
    });
  }

  /** Public : slides actifs uniquement. Admin : tous (activeOnly = false). */
  findAll(activeOnly = false) {
    return this.prisma.heroSlide.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      orderBy: { order: 'asc' },
    });
  }

  findOne(id: number) {
    return this.prisma.heroSlide.findUnique({
      where: { id },
    });
  }

  update(id: number, updateHeroDto: UpdateHeroDto) {
    return this.prisma.heroSlide.update({
      where: { id },
      data: updateHeroDto,
    });
  }

  remove(id: number) {
    return this.prisma.heroSlide.delete({
      where: { id },
    });
  }
}
