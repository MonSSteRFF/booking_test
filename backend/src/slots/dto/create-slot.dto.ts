import { IsString, IsNotEmpty, MaxLength, IsISO8601, IsInt, Min, Max } from 'class-validator';

export class CreateSlotDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsISO8601()
  @IsNotEmpty()
  startsAt: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  capacity: number;
}