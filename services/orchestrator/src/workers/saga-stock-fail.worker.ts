import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { OrderStatusEnum, SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  buildSagaNotificationPayload,
  ReplyStockReservedFailPayloadSchema,
  SagaOrderStatusUpdatedPayloadSchema,
  SagaNotificationPayloadSchema,
} from '@orchestrator/schemas';
import { randomDelay } from '@orchestrator/utils';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the reply_stock_reserved_fail topic and marks the saga as failed.
 * Updates the saga state to FAILED when stock reservation is unsuccessful.
 */
export async function startStockFailWorker() {
  const consumer = await createConsumer('orchestrator-stock-fail-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_STOCK_RESERVED_FAIL, fromBeginning: false });
    },
    { label: 'Kafka stock-fail consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(
            message.value,
            ReplyStockReservedFailPayloadSchema,
          );

          await randomDelay(1, 3);

          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.FAILED })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          const producer = await getProducer();

          await producer.send({
            topic: TOPICS.SAGA_NOTIFICATION,
            messages: [
              {
                value: buildKafkaMessage(
                  SagaNotificationPayloadSchema.parse(
                    buildSagaNotificationPayload(
                      payload.idempotencyKey,
                      'FAILED',
                      `Stock reservation failed: ${payload.reason || 'Unknown reason'}. Order cancelled.`,
                    ),
                  ),
                  {
                    action: 'Stock reservation failed',
                    service: 'orchestrator',
                    topic: TOPICS.SAGA_NOTIFICATION,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });

          await producer.send({
            topic: TOPICS.SAGA_ORDER_STATUS_UPDATED,
            messages: [
              {
                value: buildKafkaMessage(
                  SagaOrderStatusUpdatedPayloadSchema.parse({
                    idempotencyKey: payload.idempotencyKey,
                    order: payload.order,
                    status: OrderStatusEnum.CANCELLED,
                  }),
                  {
                    action: 'Stock reservation failed - saga cancelled',
                    service: 'orchestrator',
                    topic: TOPICS.SAGA_ORDER_STATUS_UPDATED,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka stock-fail consumer run' },
  );
}
