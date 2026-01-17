import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeNewsletterDto {
  @ApiProperty({ description: 'Adresse email pour la newsletter', example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
