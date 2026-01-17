import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
export interface GoogleUserDto {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    provider: string;
}
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    validateGoogleUser(googleUser: GoogleUserDto): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: any;
    }>;
    googleLogin(user: any): Promise<{
        access_token: string;
        user: any;
    }>;
}
