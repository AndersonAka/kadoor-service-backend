import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { StaffAssignableRole } from './create-staff-user.dto';

export class UpdateStaffUserDto {
  @IsOptional()
  @IsEnum(StaffAssignableRole)
  role?: StaffAssignableRole;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];

  /** Si fourni, remplace le mot de passe et force le changement à la prochaine connexion. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;
}
