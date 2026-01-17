import { IsDateString, IsNotEmpty } from 'class-validator';

export class CheckAvailabilityDto {
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}
