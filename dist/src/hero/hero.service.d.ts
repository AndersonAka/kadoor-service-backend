import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
import { PrismaService } from '../prisma/prisma.service';
export declare class HeroService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(createHeroDto: CreateHeroDto): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        titleFr: string;
        titleEn: string;
        subtitleFr: string;
        subtitleEn: string;
        imageUrl: string;
        buttonText: string | null;
        buttonLink: string | null;
        order: number;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        titleFr: string;
        titleEn: string;
        subtitleFr: string;
        subtitleEn: string;
        imageUrl: string;
        buttonText: string | null;
        buttonLink: string | null;
        order: number;
        isActive: boolean;
    }[]>;
    findOne(id: number): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        titleFr: string;
        titleEn: string;
        subtitleFr: string;
        subtitleEn: string;
        imageUrl: string;
        buttonText: string | null;
        buttonLink: string | null;
        order: number;
        isActive: boolean;
    } | null, null, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    update(id: number, updateHeroDto: UpdateHeroDto): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        titleFr: string;
        titleEn: string;
        subtitleFr: string;
        subtitleEn: string;
        imageUrl: string;
        buttonText: string | null;
        buttonLink: string | null;
        order: number;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(id: number): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
        id: number;
        createdAt: Date;
        updatedAt: Date;
        titleFr: string;
        titleEn: string;
        subtitleFr: string;
        subtitleEn: string;
        imageUrl: string;
        buttonText: string | null;
        buttonLink: string | null;
        order: number;
        isActive: boolean;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
