import { TOPICS } from '@orchestrator/constants';
import {
  parseKafkaMessage,
  CommandProcessPaymentPayloadSchema,
  ReplyPaymentSuccessPayloadSchema,
  ReplyPaymentFailPayloadSchema,
} from '@orchestrator/schemas';
import { simulateError } from '@orchestrator/utils';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getProducer, withRetry } from '../_common';

export async function startPaymentWorker() {
  const consumer = await createConsumer('payment-service-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.COMMAND_PROCESS_PAYMENT, fromBeginning: false });
    },
    { label: 'Kafka payment consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = parseKafkaMessage(message.value, CommandProcessPaymentPayloadSchema);
          console.log('[Payment Service] command_process_payment received:', payload);

          const producer = await getProducer();
          const idempotencyKey = payload.idempotencyKey;
          const order = payload.order;

          /**
           * Simulate a payment process with a 80% chance of success and 20% chance of failure.
           */
          const paymentProcessError = simulateError(80);

          if (paymentProcessError) {
            await producer.send({
              topic: TOPICS.REPLY_PAYMENT_SUCCESS,
              messages: [
                {
                  value: JSON.stringify(
                    ReplyPaymentSuccessPayloadSchema.parse({ idempotencyKey, order }),
                  ),
                },
              ],
            });
            console.log(
              '[Payment Service] Payment succeeded, published reply_payment_success:',
              idempotencyKey,
            );
            return;
          }

          await producer.send({
            topic: TOPICS.REPLY_PAYMENT_FAIL,
            messages: [
              {
                value: JSON.stringify(
                  ReplyPaymentFailPayloadSchema.parse({
                    idempotencyKey,
                    order,
                    reason: 'Payment declined (stub)',
                  }),
                ),
              },
            ],
          });

          console.log(
            '[Payment Service] Payment failed, published reply_payment_fail:',
            idempotencyKey,
          );
        },
      });
    },
    { label: 'Kafka payment consumer run' },
  );
}
