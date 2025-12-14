import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseordersService } from './purchaseorders.service';

describe('PurchaseordersService', () => {
  let service: PurchaseordersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PurchaseordersService],
    }).compile();

    service = module.get<PurchaseordersService>(PurchaseordersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
