import { ORDER_STATUS_VALUES } from '@orchestrator/enums';
import { z } from 'zod';

export const OrderSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
  status: z.enum(ORDER_STATUS_VALUES),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type Order = z.infer<typeof OrderSchema>;
