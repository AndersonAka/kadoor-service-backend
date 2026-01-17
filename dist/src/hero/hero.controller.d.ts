import { HeroService } from './hero.service';
import { CreateHeroDto } from './dto/create-hero.dto';
import { UpdateHeroDto } from './dto/update-hero.dto';
export declare class HeroController {
    private readonly heroService;
    constructor(heroService: HeroService);
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
    findOne(id: string): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
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
    update(id: string, updateHeroDto: UpdateHeroDto): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
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
    remove(id: string): import("@prisma/client").Prisma.Prisma__HeroSlideClient<{
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
