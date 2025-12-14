import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { RfidStatus } from '@prisma/client';

export class UpdateRfidDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsEnum(RfidStatus)
  status?: RfidStatus;

  @IsOptional()
  @IsDateString()
  lastSeenAt?: string; // ISO string
}
