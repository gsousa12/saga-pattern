import { z } from 'zod';

import { OrderSchema } from '../domain/order.js';

export const CommandProcessPaymentPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type CommandProcessPaymentPayload = z.infer<typeof CommandProcessPaymentPayloadSchema>;

export const ReplyPaymentSuccessPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type ReplyPaymentSuccessPayload = z.infer<typeof ReplyPaymentSuccessPayloadSchema>;

export const ReplyPaymentFailPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
  reason: z.string().min(1),
});

export type ReplyPaymentFailPayload = z.infer<typeof ReplyPaymentFailPayloadSchema>;
