import { IsArray, IsNumber, IsOptional, IsString } from 'class-validator';

export class UpdatePurchaseOrderDto {
  @IsNumber()
  @IsOptional()
  supplierId?: number;

  @IsString()
  @IsOptional()
  note?: string;

  @IsArray()
  items: {
    sku: string;
    name: string;
    qty: number;
    unitCost: number;
    lineTotal: number;
  }[];
}
