import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import { parseKafkaMessage, ReplyStockReservedFailPayloadSchema } from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, withRetry } from '../_common';

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

          const payload = parseKafkaMessage(message.value, ReplyStockReservedFailPayloadSchema);
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.FAILED })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });
        },
      });
    },
    { label: 'Kafka stock-fail consumer run' },
  );
}
