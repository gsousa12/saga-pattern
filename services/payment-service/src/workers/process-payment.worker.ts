import { TOPICS } from '@orchestrator/constants';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  CommandProcessPaymentPayloadSchema,
  ReplyPaymentSuccessPayloadSchema,
  ReplyPaymentFailPayloadSchema,
} from '@orchestrator/schemas';
import { simulateError } from '@orchestrator/utils';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getProducer, withRetry } from '../_common';

/**
 * Listens to the command_process_payment topic and simulates a payment attempt.
 * With an 80% chance of success, publishes a success reply; otherwise publishes a failure reply.
 */
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

          const { payload } = parseKafkaEnvelope(message.value, CommandProcessPaymentPayloadSchema);

          const producer = await getProducer();
          const idempotencyKey = payload.idempotencyKey;
          const order = payload.order;

          const paymentProcessError = simulateError(80);

          if (paymentProcessError) {
            await producer.send({
              topic: TOPICS.REPLY_PAYMENT_SUCCESS,
              messages: [
                {
                  value: buildKafkaMessage(
                    ReplyPaymentSuccessPayloadSchema.parse({ idempotencyKey, order }),
                    {
                      action: 'Payment processed successfully',
                      service: 'payment-service',
                      topic: TOPICS.REPLY_PAYMENT_SUCCESS,
                      idempotencyKey,
                    },
                  ),
                },
              ],
            });
            return;
          }

          await producer.send({
            topic: TOPICS.REPLY_PAYMENT_FAIL,
            messages: [
              {
                value: buildKafkaMessage(
                  ReplyPaymentFailPayloadSchema.parse({
                    idempotencyKey,
                    order,
                    reason: 'Payment declined (stub)',
                  }),
                  {
                    action: 'Payment processing failed',
                    service: 'payment-service',
                    topic: TOPICS.REPLY_PAYMENT_FAIL,
                    idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka payment consumer run' },
  );
}
