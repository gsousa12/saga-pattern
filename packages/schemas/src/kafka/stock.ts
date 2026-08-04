import { z } from 'zod';

import { OrderSchema } from '../domain/order.js';

export const CommandReserveStockPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type CommandReserveStockPayload = z.infer<typeof CommandReserveStockPayloadSchema>;

export const ReplyStockReservedSuccessPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
  reservedQuantity: z.number().int().positive().optional(),
});

export type ReplyStockReservedSuccessPayload = z.infer<
  typeof ReplyStockReservedSuccessPayloadSchema
>;

export const ReplyStockReservedFailPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
  reason: z.string().min(1),
});

export type ReplyStockReservedFailPayload = z.infer<typeof ReplyStockReservedFailPayloadSchema>;

export const CommandReleaseStockPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type CommandReleaseStockPayload = z.infer<typeof CommandReleaseStockPayloadSchema>;

export const ReplyStockReleasedSuccessPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
});

export type ReplyStockReleasedSuccessPayload = z.infer<
  typeof ReplyStockReleasedSuccessPayloadSchema
>;

export const ReplyStockReleasedFailPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  order: OrderSchema,
  reason: z.string().min(1),
});

export type ReplyStockReleasedFailPayload = z.infer<typeof ReplyStockReleasedFailPayloadSchema>;
