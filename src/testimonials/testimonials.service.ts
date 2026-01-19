import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';

@Injectable()
export class TestimonialsService {
  constructor(private prisma: PrismaService) {}

  async create(createTestimonialDto: CreateTestimonialDto) {
    return this.prisma.testimonial.create({
      data: createTestimonialDto,
    });
  }

  async findAll(activeOnly: boolean = false) {
    const where = activeOnly ? { isActive: true } : {};
    return this.prisma.testimonial.findMany({
      where,
      orderBy: [
        { order: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: string) {
    const testimonial = await this.prisma.testimonial.findUnique({
      where: { id },
    });

    if (!testimonial) {
      throw new NotFoundException(`Testimonial with ID ${id} not found`);
    }

    return testimonial;
  }

  async update(id: string, updateTestimonialDto: UpdateTestimonialDto) {
    await this.findOne(id); // Vérifier que le témoignage existe

    return this.prisma.testimonial.update({
      where: { id },
      data: updateTestimonialDto,
    });
  }

  async remove(id: string) {
    await this.findOne(id); // Vérifier que le témoignage existe

    return this.prisma.testimonial.delete({
      where: { id },
    });
  }
}
