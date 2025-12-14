import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class ProductsPipe<T = any> implements PipeTransform {
  constructor(private readonly itemName = 'item') {}

  transform(value: any, _meta: ArgumentMetadata): T[] {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return [value];
    throw new BadRequestException(
      `Body phải là object hoặc array ${this.itemName}`,
    );
  }
}
