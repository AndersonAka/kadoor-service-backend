import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export enum StaffAssignableRole {
  ADMIN = 'ADMIN',
  COMMERCIAL = 'COMMERCIAL',
}

export class CreateStaffUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  password: string;

  @IsEnum(StaffAssignableRole)
  role: StaffAssignableRole;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  /** Modules autorisés (uniquement pour COMMERCIAL). */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
