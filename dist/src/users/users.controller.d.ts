import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    create(createUserDto: CreateUserDto): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        googleId: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(): import("@prisma/client").Prisma.PrismaPromise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        role: import("@prisma/client").$Enums.Role;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        googleId: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    } | null>;
    update(id: string, updateUserDto: UpdateUserDto): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        googleId: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
    remove(id: string): import("@prisma/client").Prisma.Prisma__UserClient<{
        id: string;
        email: string;
        password: string | null;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        role: import("@prisma/client").$Enums.Role;
        googleId: string | null;
        avatar: string | null;
        provider: string | null;
        createdAt: Date;
        updatedAt: Date;
    }, never, import("@prisma/client/runtime/client").DefaultArgs, import("@prisma/client").Prisma.PrismaClientOptions>;
}
