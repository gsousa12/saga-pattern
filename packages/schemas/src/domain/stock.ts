import { z } from 'zod';

export const StockSchema = z.object({
  id: z.string().uuid().optional(),
  productId: z.string().uuid(),
  availableQuantity: z.number().int().nonnegative(),
  reservedQuantity: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export type Stock = z.infer<typeof StockSchema>;
