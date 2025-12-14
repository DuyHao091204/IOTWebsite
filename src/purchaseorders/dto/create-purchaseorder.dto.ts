import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * ✅ DTO cho từng sản phẩm trong đơn nhập
 */
export class PurchaseOrderItemDto {
  @IsString()
  @IsNotEmpty({ message: 'SKU không được để trống.' })
  sku: string; // Mã sản phẩm

  @IsOptional()
  @IsString()
  name?: string; // Tên sản phẩm (nếu sản phẩm mới)

  @IsNumber()
  @IsPositive({ message: 'Số lượng phải lớn hơn 0.' })
  qty: number;

  @IsNumber()
  @IsPositive({ message: 'Thành tiền (lineTotal) phải lớn hơn 0.' })
  lineTotal: number; // Tổng tiền của dòng (dùng để tính giá nhập)
}

/**
 * ✅ DTO chính cho việc tạo đơn nhập hàng
 */
export class CreatePurchaseOrderDto {
  @IsInt()
  @IsPositive({ message: 'supplierId phải là số dương.' })
  supplierId: number;

  @IsInt()
  @IsPositive({ message: 'createdById phải là số dương.' })
  createdById: number;

  @IsOptional()
  @IsString()
  note?: string; // Ghi chú thêm

  @IsArray({ message: 'Danh sách sản phẩm phải là một mảng.' })
  @ValidateNested({ each: true })
  @Type(() => PurchaseOrderItemDto)
  items: PurchaseOrderItemDto[];
}
