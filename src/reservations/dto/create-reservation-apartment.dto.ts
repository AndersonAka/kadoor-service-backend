import { IsNotEmpty, IsDateString, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateReservationApartmentDto {
  @IsNotEmpty()
  @IsString()
  apartmentId: string;

  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  @IsIn(['SPONTANEE', 'DIFFEREE'])
  reservationType?: string; // SPONTANEE = same day (6h min), DIFFEREE = future date

  @IsOptional()
  @IsString()
  entryTime?: string; // Heure d'entrée souhaitée (HH:MM)

  @IsOptional()
  @IsNumber()
  numberOfGuests?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  promoCode?: string;
}
