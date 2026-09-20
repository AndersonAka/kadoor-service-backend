import { IsString, IsOptional, IsInt, IsBoolean, IsUrl } from 'class-validator';

export class CreateHeroDto {
  @IsString()
  titleFr: string;

  @IsString()
  titleEn: string;

  @IsString()
  subtitleFr: string;

  @IsString()
  subtitleEn: string;

  @IsUrl({ require_tld: false })
  imageUrl: string;

  @IsOptional()
  @IsString()
  buttonTextFr?: string;

  @IsOptional()
  @IsString()
  buttonTextEn?: string;

  @IsOptional()
  @IsString()
  buttonLink?: string;

  @IsOptional()
  @IsInt()
  order?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
