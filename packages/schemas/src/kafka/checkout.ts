import { z } from 'zod';

import { OrderSchema } from '../domain/order.js';

export const SagaStartCheckoutPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type SagaStartCheckoutPayload = z.infer<typeof SagaStartCheckoutPayloadSchema>;
