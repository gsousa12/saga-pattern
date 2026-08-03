import { z } from 'zod';

export const CreateProductBodySchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive(),
  description: z.string().max(500).optional(),
});

export type CreateProductBody = z.infer<typeof CreateProductBodySchema>;
