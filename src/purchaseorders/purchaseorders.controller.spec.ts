import { Test, TestingModule } from '@nestjs/testing';
import { PurchaseordersController } from './purchaseorders.controller';

describe('PurchaseordersController', () => {
  let controller: PurchaseordersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PurchaseordersController],
    }).compile();

    controller = module.get<PurchaseordersController>(PurchaseordersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
