import { ExecutionContext } from '@nestjs/common';
declare const JwtOptionalGuard_base: import("@nestjs/passport").Type<import("@nestjs/passport").IAuthGuard>;
export declare class JwtOptionalGuard extends JwtOptionalGuard_base {
    handleRequest(err: any, user: any, info: any, context: ExecutionContext): any;
}
export {};
