import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private configService;
    private logger;
    constructor(configService: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    private static maskPassword;
}
