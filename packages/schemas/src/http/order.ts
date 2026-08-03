import { z } from 'zod';

export const CreateOrderBodySchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
  totalPrice: z.number().positive(),
});

export type CreateOrderBody = z.infer<typeof CreateOrderBodySchema>;
