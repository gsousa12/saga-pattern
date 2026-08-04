import { OrderStatusEnum } from '@orchestrator/enums';
import { z } from 'zod';

import { OrderSchema } from '../domain/order.js';

export const SagaOrderStatusUpdatedPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
  status: z.enum([OrderStatusEnum.COMPLETED, OrderStatusEnum.CANCELLED]),
});

export type SagaOrderStatusUpdatedPayload = z.infer<typeof SagaOrderStatusUpdatedPayloadSchema>;
