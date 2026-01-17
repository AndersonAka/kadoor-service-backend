import { IsNotEmpty, IsDateString, IsString, IsOptional, IsNumber } from 'class-validator';

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
