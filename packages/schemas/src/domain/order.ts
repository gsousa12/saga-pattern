import { ORDER_STATUS_VALUES } from '@orchestrator/enums';
import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
  status: z.enum(ORDER_STATUS_VALUES),
  createdAt: z
    .preprocess(
      (val) => (val instanceof Date ? val.toISOString() : val),
      z.string().datetime().optional(),
    )
    .optional(),
  updatedAt: z
    .preprocess(
      (val) => (val instanceof Date ? val.toISOString() : val),
      z.string().datetime().optional(),
    )
    .optional(),
  deletedAt: z
    .preprocess(
      (val) => (val instanceof Date ? val.toISOString() : val),
      z.string().datetime().nullable().optional(),
    )
    .optional(),
});

export type Order = z.infer<typeof OrderSchema>;
