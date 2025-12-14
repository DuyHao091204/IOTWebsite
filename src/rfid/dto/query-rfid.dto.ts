import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { RfidStatus } from '@prisma/client';

export class RfidQueryDto {
  @IsOptional()
  @IsString()
  q?: string; // uid contains

  @IsOptional()
  @IsInt()
  @Min(1)
  productId?: number;

  @IsOptional()
  @IsEnum(RfidStatus)
  status?: RfidStatus;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @IsOptional()
  @IsIn(['uid', 'lastSeenAt', 'createdAt'])
  orderBy?: 'uid' | 'lastSeenAt' | 'createdAt' = 'uid';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'asc';
}
