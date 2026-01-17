"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_service_1 = require("./auth.service");
const login_dto_1 = require("./dto/login.dto");
const create_user_dto_1 = require("../users/dto/create-user.dto");
const users_service_1 = require("../users/users.service");
const passport_1 = require("@nestjs/passport");
const swagger_1 = require("@nestjs/swagger");
let AuthController = class AuthController {
    authService;
    usersService;
    configService;
    constructor(authService, usersService, configService) {
        this.authService = authService;
        this.usersService = usersService;
        this.configService = configService;
    }
    async login(loginDto) {
        try {
            console.log(`[AuthController] Login attempt for: ${loginDto.email}`);
            const user = await this.authService.validateUser(loginDto.email, loginDto.password);
            if (!user) {
                console.log(`[AuthController] Login failed for: ${loginDto.email}`);
                throw new common_1.UnauthorizedException('Invalid credentials');
            }
            console.log(`[AuthController] Login successful for: ${loginDto.email}`);
            const result = await this.authService.login(user);
            console.log(`[AuthController] Returning login result for: ${loginDto.email}`, JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error(`[AuthController] Error in login:`, error);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.UnauthorizedException('Login failed');
        }
    }
    async register(createUserDto) {
        return this.usersService.create(createUserDto);
    }
    getProfile(req) {
        return req.user;
    }
    async googleAuth() {
    }
    async googleAuthRedirect(req, res) {
        try {
            console.log('[AuthController] Google callback received');
            const result = await this.authService.googleLogin(req.user);
            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
            const redirectUrl = `${frontendUrl}/auth/google/callback?token=${result.access_token}`;
            console.log('[AuthController] Redirecting to:', redirectUrl);
            return res.redirect(redirectUrl);
        }
        catch (error) {
            console.error('[AuthController] Google callback error:', error);
            const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
            return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
        }
    }
    async googleTokenLogin(credential) {
        try {
            console.log('[AuthController] Google token login attempt');
            const { OAuth2Client } = require('google-auth-library');
            const client = new OAuth2Client(this.configService.get('GOOGLE_CLIENT_ID'));
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: this.configService.get('GOOGLE_CLIENT_ID'),
            });
            const payload = ticket.getPayload();
            const googleUser = {
                googleId: payload.sub,
                email: payload.email,
                firstName: payload.given_name || '',
                lastName: payload.family_name || '',
                avatar: payload.picture || null,
                provider: 'google',
            };
            console.log('[AuthController] Google user from token:', googleUser.email);
            const user = await this.authService.validateGoogleUser(googleUser);
            return this.authService.login(user);
        }
        catch (error) {
            console.error('[AuthController] Google token login error:', error);
            throw new common_1.UnauthorizedException('Invalid Google token');
        }
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion utilisateur' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connexion réussie' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Identifiants invalides' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Inscription utilisateur' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Inscription réussie' }),
    (0, swagger_1.ApiResponse)({ status: 409, description: 'Email déjà utilisé' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_user_dto_1.CreateUserDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    (0, common_1.Get)('profile'),
    (0, swagger_1.ApiOperation)({ summary: 'Récupérer le profil utilisateur' }),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    (0, swagger_1.ApiOperation)({ summary: 'Initier la connexion Google OAuth' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuth", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    (0, swagger_1.ApiOperation)({ summary: 'Callback Google OAuth' }),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleAuthRedirect", null);
__decorate([
    (0, common_1.Post)('google/token'),
    (0, swagger_1.ApiOperation)({ summary: 'Connexion Google avec token ID (pour frontend)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connexion réussie' }),
    (0, swagger_1.ApiResponse)({ status: 401, description: 'Token invalide' }),
    __param(0, (0, common_1.Body)('credential')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleTokenLogin", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        users_service_1.UsersService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map