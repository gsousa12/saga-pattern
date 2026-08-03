import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import { parseKafkaMessage, ReplyPaymentFailPayloadSchema } from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, withRetry } from '../_common';

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

          const payload = parseKafkaMessage(message.value, ReplyPaymentFailPayloadSchema);
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.ROLLBACKING_STOCK })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });

          // TODO: publicar command_release_stock para o stock service fazer rollback
        },
      });
    },
    { label: 'Kafka payment-fail consumer run' },
  );
}
