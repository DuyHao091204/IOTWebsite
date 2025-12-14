import { IsNotEmpty, IsNumber, IsString, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\S.*$/)
  name: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\S.*$/)
  sku: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  sellPrice: number;
}
