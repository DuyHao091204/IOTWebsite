import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ProductQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

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
  @IsIn(['createdAt', 'updatedAt', 'name', 'sku', 'sellPrice'])
  orderBy?: 'createdAt' | 'updatedAt' | 'name' | 'sku' | 'sellPrice' =
    'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDir?: 'asc' | 'desc' = 'desc';
}
