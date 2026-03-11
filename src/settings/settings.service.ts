import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  // Get all settings
  async findAll() {
    return this.prisma.siteSettings.findMany();
  }

  // Get a setting by key
  async findByKey(key: string) {
    return this.prisma.siteSettings.findUnique({
      where: { key },
    });
  }

  // Create or update a setting (upsert)
  async upsert(key: string, value: string, description?: string) {
    return this.prisma.siteSettings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
  }

  // Delete a setting
  async remove(key: string) {
    return this.prisma.siteSettings.delete({
      where: { key },
    });
  }
}
