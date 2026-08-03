import { z } from 'zod';

export const CheckoutBodySchema = z.object({
  idempotencyKey: z.string().min(1),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export type CheckoutBody = z.infer<typeof CheckoutBodySchema>;
