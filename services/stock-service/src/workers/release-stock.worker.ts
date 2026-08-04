import { TOPICS } from '@orchestrator/constants';
import { stock } from '@orchestrator/db';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
  CommandReleaseStockPayloadSchema,
  ReplyStockReleasedSuccessPayloadSchema,
} from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the command_release_stock topic and releases previously reserved stock.
 * Decrements reservedQuantity and increments availableQuantity within a transaction,
 * then publishes a success reply to the orchestrator.
 */
export async function startReleaseStockWorker() {
  const consumer = await createConsumer('stock-service-release-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.COMMAND_RELEASE_STOCK, fromBeginning: false });
    },
    { label: 'Kafka release-stock consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(message.value, CommandReleaseStockPayloadSchema);

          const db = await getDbInstance();
          const producer = await getProducer();

          const order = payload.order;
          const idempotencyKey = payload.idempotencyKey;

          const [stockRecord] = await db
            .select()
            .from(stock)
            .where(eq(stock.productId, order.productId));

          if (!stockRecord) {
            await producer.send({
              topic: TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
              messages: [
                {
                  value: buildKafkaMessage(
                    ReplyStockReleasedSuccessPayloadSchema.parse({ idempotencyKey, order }),
                    {
                      action: 'Stock release acknowledged - stock not found',
                      service: 'stock-service',
                      topic: TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
                      idempotencyKey,
                    },
                  ),
                },
              ],
            });
            return;
          }

          await db.transaction(async (tx) => {
            await tx
              .update(stock)
              .set({
                availableQuantity: stockRecord.availableQuantity + order.quantity,
                reservedQuantity: Math.max(0, stockRecord.reservedQuantity - order.quantity),
              })
              .where(eq(stock.id, stockRecord.id));
          });

          await producer.send({
            topic: TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
            messages: [
              {
                value: buildKafkaMessage(
                  ReplyStockReleasedSuccessPayloadSchema.parse({ idempotencyKey, order }),
                  {
                    action: 'Stock released successfully',
                    service: 'stock-service',
                    topic: TOPICS.REPLY_STOCK_RELEASED_SUCCESS,
                    idempotencyKey,
                  },
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka release-stock consumer run' },
  );
}
