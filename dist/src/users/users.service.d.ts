import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
export interface GoogleUserData {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    provider: string;
}
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    create(createUserDto: CreateUserDto): Promise<{
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    createGoogleUser(googleUserData: GoogleUserData): Promise<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    linkGoogleAccount(userId: string, googleId: string, avatar?: string): Promise<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findByGoogleId(googleId: string): Promise<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        email: string;
        firstName: string | null;
        lastName: string | null;
        id: string;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    findByEmail(email: string): Promise<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updateUserDto: UpdateUserDto): import("@prisma/client").Prisma.Prisma__UserClient<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        id: string;
        googleId: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
