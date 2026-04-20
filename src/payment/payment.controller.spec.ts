import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { beforeEach, describe, it } from 'node:test';

void describe('PaymentController', async () => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let controller: PaymentController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
  });

 await it('should be defined', () => {
  });
});
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function expect(_controller: PaymentController) {
  throw new Error('Function not implemented.');
}

