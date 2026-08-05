import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  buildSagaNotificationPayload,
  ReplyStockReservedSuccessPayloadSchema,
  CommandProcessPaymentPayloadSchema,
  SagaNotificationPayloadSchema,
} from '@orchestrator/schemas';
import { randomDelay } from '@orchestrator/utils';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the reply_stock_reserved_success topic and advances the saga to the payment step.
 * Updates the saga state to PENDING_PAYMENT and publishes a command to process payment.
 */
export async function startStockSuccessWorker() {
  const consumer = await createConsumer('orchestrator-stock-success-group');

  await withRetry(
    async () => {
      await consumer.subscribe({
        topic: TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
        fromBeginning: false,
      });
    },
    { label: 'Kafka stock-success consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(
            message.value,
            ReplyStockReservedSuccessPayloadSchema,
          );

          await randomDelay(0.2, 0.8);

          const db = await getDbInstance();
          const producer = await getProducer();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.PENDING_PAYMENT })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          await producer.send({
            topic: TOPICS.SAGA_NOTIFICATION,
            messages: [
              {
                value: buildKafkaMessage(
                  SagaNotificationPayloadSchema.parse(
                    buildSagaNotificationPayload(
                      payload.idempotencyKey,
                      'PENDING_PAYMENT',
                      'Stock reserved. Processing payment...',
                    ),
                  ),
                  {
                    action: 'Stock reserved',
                    service: 'orchestrator',
                    topic: TOPICS.SAGA_NOTIFICATION,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });

          await producer.send({
            topic: TOPICS.COMMAND_PROCESS_PAYMENT,
            messages: [
              {
                value: buildKafkaMessage(
                  CommandProcessPaymentPayloadSchema.parse({
                    idempotencyKey: payload.idempotencyKey,
                    order: payload.order,
                  }),
                  {
                    action: 'Stock reserved - command process payment',
                    service: 'orchestrator',
                    topic: TOPICS.COMMAND_PROCESS_PAYMENT,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka stock-success consumer run' },
  );
}
