import { TOPICS } from '@orchestrator/constants';
import { orders } from '@orchestrator/db';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { getDbInstance, getProducer } from '../_common';

const checkoutBodySchema = z.object({
  idempotencyKey: z.string().min(1),
  productId: z.string().uuid(),
  quantity: z.number().int().positive(),
});

export async function checkout(req: FastifyRequest, reply: FastifyReply) {
  const body = checkoutBodySchema.parse(req.body);
  const db = await getDbInstance();

  // buscar o preco do produto - por enquanto mock
  const totalPrice = body.quantity * 100; // mock price

  const order = await db.transaction(async (tx) => {
    const [result] = await tx
      .insert(orders)
      .values({ productId: body.productId, quantity: body.quantity, totalPrice })
      .returning();
    return result;
  });

  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.SAGA_START_CHECKOUT,
    messages: [{ value: JSON.stringify({ idempotencyKey: body.idempotencyKey, order }) }],
  });

  return reply.status(202).send({ message: 'Order created', order });
}
