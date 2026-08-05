import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  buildSagaNotificationPayload,
  SagaStartCheckoutPayloadSchema,
  CommandReserveStockPayloadSchema,
  SagaNotificationPayloadSchema,
} from '@orchestrator/schemas';
import { randomDelay } from '@orchestrator/utils';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the saga_start_checkout topic and initializes a new saga.
 * Persists the saga state as PENDING_STOCK and publishes a command to reserve stock.
 */
export async function startSagaWorker() {
  const consumer = await createConsumer('orchestrator-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.SAGA_START_CHECKOUT, fromBeginning: false });
    },
    { label: 'Kafka saga consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(message.value, SagaStartCheckoutPayloadSchema);

          await randomDelay(2, 5);

          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .insert(sagaStates)
              .values({
                idempotencyKey: payload.idempotencyKey,
                businessId: payload.order.id,
                currentStep: SagaStepEnum.PENDING_STOCK,
                payload: payload,
              });
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
                      'PENDING_STOCK',
                      'Order created. Waiting for stock reservation.',
                    ),
                  ),
                  {
                    action: 'Saga started',
                    service: 'orchestrator',
                    topic: TOPICS.SAGA_NOTIFICATION,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });

          await producer.send({
            topic: TOPICS.COMMAND_RESERVE_STOCK,
            messages: [
              {
                value: buildKafkaMessage(
                  CommandReserveStockPayloadSchema.parse({
                    idempotencyKey: payload.idempotencyKey,
                    order: payload.order,
                  }),
                  {
                    action: 'Saga started - command reserve stock',
                    service: 'orchestrator',
                    topic: TOPICS.COMMAND_RESERVE_STOCK,
                    idempotencyKey: payload.idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka saga consumer run' },
  );
}
