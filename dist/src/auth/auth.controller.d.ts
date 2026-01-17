import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { UsersService } from '../users/users.service';
export declare class AuthController {
    private authService;
    private usersService;
    private configService;
    constructor(authService: AuthService, usersService: UsersService, configService: ConfigService);
    login(loginDto: LoginDto): Promise<{
        access_token: string;
        user: any;
    }>;
    register(createUserDto: CreateUserDto): Promise<{
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
    getProfile(req: any): any;
    googleAuth(): Promise<void>;
    googleAuthRedirect(req: any, res: Response): Promise<void>;
    googleTokenLogin(credential: string): Promise<{
        access_token: string;
        user: any;
    }>;
}
