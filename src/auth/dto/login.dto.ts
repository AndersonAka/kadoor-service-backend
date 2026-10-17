import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  /** Si true : révoque la session staff existante et en ouvre une nouvelle. */
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}
