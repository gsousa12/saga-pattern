import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import {
  parseKafkaMessage,
  SagaStartCheckoutPayloadSchema,
  CommandReserveStockPayloadSchema,
} from '@orchestrator/schemas';
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

          const payload = parseKafkaMessage(message.value, SagaStartCheckoutPayloadSchema);

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
            topic: TOPICS.COMMAND_RESERVE_STOCK,
            messages: [
              {
                value: JSON.stringify(
                  CommandReserveStockPayloadSchema.parse({
                    idempotencyKey: payload.idempotencyKey,
                    order: payload.order,
                  }),
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
