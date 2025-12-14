import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { RfidStatus } from '@prisma/client';

export class CreateRfidDto {
  @IsString()
  @IsNotEmpty()
  uid: string;

  @IsInt()
  @Min(1)
  productId: number;

  @IsOptional()
  @IsEnum(RfidStatus)
  status?: RfidStatus;
}
