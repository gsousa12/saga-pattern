import { TOPICS } from '@orchestrator/constants';
import { orders, products } from '@orchestrator/db';
import {
  CheckoutBodySchema,
  SagaStartCheckoutPayloadSchema,
  buildKafkaMessage,
} from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { getDbInstance, getProducer } from '../_common';

export async function checkout(req: FastifyRequest, reply: FastifyReply) {
  const body = CheckoutBodySchema.parse(req.body);
  const db = await getDbInstance();

  const order = await db.transaction(async (tx) => {
    const [product] = await tx.select().from(products).where(eq(products.id, body.productId));

    if (!product) {
      throw new Error(`Product not found: ${body.productId}`);
    }

    const totalPrice = body.quantity * product.price;

    const [result] = await tx
      .insert(orders)
      .values({ productId: body.productId, quantity: body.quantity, totalPrice })
      .returning();
    return result;
  });

  const producer = await getProducer();

  const payload = SagaStartCheckoutPayloadSchema.parse({
    idempotencyKey: body.idempotencyKey,
    order,
  });

  await producer.send({
    topic: TOPICS.SAGA_START_CHECKOUT,
    messages: [
      {
        value: buildKafkaMessage(payload, {
          action: 'Checkout saga initiated',
          service: 'order-service',
          topic: TOPICS.SAGA_START_CHECKOUT,
          idempotencyKey: body.idempotencyKey,
        }),
      },
    ],
  });

  return reply.status(202).send({ message: 'Order created', order });
}
