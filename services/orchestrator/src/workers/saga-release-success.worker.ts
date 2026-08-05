import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { OrderStatusEnum, SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  buildSagaNotificationPayload,
  ReplyStockReleasedSuccessPayloadSchema,
  SagaOrderStatusUpdatedPayloadSchema,
  SagaNotificationPayloadSchema,
} from '@orchestrator/schemas';
import { randomDelay } from '@orchestrator/utils';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the reply_stock_released_success topic and finalizes the saga rollback.
 * Updates the saga state to FAILED after the stock has been successfully released.
 */
export async function startReleaseSuccessWorker() {
  const consumer = await createConsumer('orchestrator-release-success-group');

  await withRetry(
    async () => {
      await consumer.subscribe({
        topic: TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
        fromBeginning: false,
      });
    },
    { label: 'Kafka release-success consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(
            message.value,
            ReplyStockReleasedSuccessPayloadSchema,
          );

          await randomDelay(3, 8);

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
                      'Stock released. Order cancelled after rollback.',
                    ),
                  ),
                  {
                    action: 'Rollback completed',
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
                    action: 'Stock released - saga cancelled after rollback',
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
    { label: 'Kafka release-success consumer run' },
  );
}
