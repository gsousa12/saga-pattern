import { orders } from '@orchestrator/db';

import { getDbInstance } from '../_common/db';
import { createConsumer, getProducer, withRetry } from '../_common/kafka';

export async function startOrderWorker() {
  const consumer = await createConsumer('order-service-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: 'orders.create', fromBeginning: false });
    },
    { label: 'Kafka consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }) => {
          if (!message.value) return;

          const payload = JSON.parse(message.value.toString());
          const db = await getDbInstance();

          const order = await db.transaction(async (tx) => {
            const [result] = await tx
              .insert(orders)
              .values({
                productId: payload.productId,
                quantity: payload.quantity,
                totalPrice: payload.totalPrice,
              })
              .returning();
            return result;
          });

          const producer = await getProducer();
          await producer.send({
            topic: 'orders.created',
            messages: [{ value: JSON.stringify(order) }],
          });
        },
      });
    },
    { label: 'Kafka consumer run' },
  );
}
