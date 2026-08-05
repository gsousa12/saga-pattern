import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  buildSagaNotificationPayload,
  CommandReleaseStockPayloadSchema,
  ReplyPaymentFailPayloadSchema,
  SagaNotificationPayloadSchema,
} from '@orchestrator/schemas';
import { randomDelay } from '@orchestrator/utils';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the reply_payment_fail topic and initiates a rollback.
 * Updates the saga state to ROLLBACKING_STOCK when payment processing fails.
 */
export async function startPaymentFailWorker() {
  const consumer = await createConsumer('orchestrator-payment-fail-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_PAYMENT_FAIL, fromBeginning: false });
    },
    { label: 'Kafka payment-fail consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(message.value, ReplyPaymentFailPayloadSchema);

          await randomDelay(3, 5);

          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.ROLLBACKING_STOCK })
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
                      'ROLLBACKING_STOCK',
                      `Payment failed: ${payload.reason || 'Unknown reason'}. Releasing stock...`,
                    ),
                  ),
                  {
                    action: 'Payment failed',
                    service: 'orchestrator',
                    topic: TOPICS.SAGA_NOTIFICATION,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });

          await producer.send({
            topic: TOPICS.COMMAND_RELEASE_STOCK,
            messages: [
              {
                value: buildKafkaMessage(
                  CommandReleaseStockPayloadSchema.parse({
                    idempotencyKey: payload.idempotencyKey,
                    order: payload.order,
                  }),
                  {
                    action: 'Payment failed - command release stock rollback',
                    service: 'orchestrator',
                    topic: TOPICS.COMMAND_RELEASE_STOCK,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka payment-fail consumer run' },
  );
}
