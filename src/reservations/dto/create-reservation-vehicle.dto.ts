import { IsNotEmpty, IsDateString, IsString, IsOptional, IsNumber, IsIn } from 'class-validator';

export class CreateReservationVehicleDto {
  @IsNotEmpty()
  @IsString()
  vehicleId: string;

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
  pickupTime?: string; // Heure de prise en charge souhaitée (HH:MM)

  @IsOptional()
  @IsString()
  pickupLocation?: string;

  @IsOptional()
  @IsString()
  dropoffLocation?: string;

  @IsOptional()
  @IsNumber()
  additionalDrivers?: number;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
