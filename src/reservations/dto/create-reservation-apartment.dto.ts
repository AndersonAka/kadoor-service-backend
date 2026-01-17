import { IsNotEmpty, IsDateString, IsString, IsOptional, IsNumber } from 'class-validator';

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
  @IsNumber()
  numberOfGuests?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
