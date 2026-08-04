import { TOPICS } from '@orchestrator/constants';
import { orders } from '@orchestrator/db';
import { parseKafkaEnvelope, SagaOrderStatusUpdatedPayloadSchema } from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, withRetry } from '../_common';

/**
 * Listens to the saga_order_status_updated topic and syncs the final order status.
 * Updates the order record to COMPLETED or CANCELLED based on the saga outcome.
 */
export async function startUpdateOrderStatusWorker() {
  const consumer = await createConsumer('order-service-status-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.SAGA_ORDER_STATUS_UPDATED, fromBeginning: false });
    },
    { label: 'Kafka order-status consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(
            message.value,
            SagaOrderStatusUpdatedPayloadSchema,
          );
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(orders)
              .set({ status: payload.status })
              .where(eq(orders.id, payload.order.id));
          });
        },
      });
    },
    { label: 'Kafka order-status consumer run' },
  );
}
