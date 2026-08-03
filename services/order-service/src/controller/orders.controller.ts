import { TOPICS } from '@orchestrator/constants';
import { orders } from '@orchestrator/db';
import { CheckoutBodySchema } from '@orchestrator/schemas';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { getDbInstance, getProducer } from '../_common';

export async function checkout(req: FastifyRequest, reply: FastifyReply) {
  const body = CheckoutBodySchema.parse(req.body);
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
