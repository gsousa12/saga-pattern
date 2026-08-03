import { TOPICS } from '@orchestrator/constants';
import { sagaStates } from '@orchestrator/db';
import { SagaStepEnum } from '@orchestrator/enums';
import { parseKafkaMessage, ReplyPaymentSuccessPayloadSchema } from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, withRetry } from '../_common';

/**
 * Listens to the reply_payment_success topic and completes the saga.
 * Updates the saga state to COMPLETED when the payment is processed successfully.
 */
export async function startPaymentSuccessWorker() {
  const consumer = await createConsumer('orchestrator-payment-success-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.REPLY_PAYMENT_SUCCESS, fromBeginning: false });
    },
    { label: 'Kafka payment-success consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = parseKafkaMessage(message.value, ReplyPaymentSuccessPayloadSchema);
          const db = await getDbInstance();

          await db.transaction(async (tx) => {
            await tx
              .update(sagaStates)
              .set({ currentStep: SagaStepEnum.COMPLETED })
              .where(eq(sagaStates.idempotencyKey, payload.idempotencyKey));
          });
        },
      });
    },
    { label: 'Kafka payment-success consumer run' },
  );
}
