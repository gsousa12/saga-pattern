import { TOPICS } from '@orchestrator/constants';
import { stock } from '@orchestrator/db';
import {
  parseKafkaMessage,
  CommandReserveStockPayloadSchema,
  ReplyStockReservedSuccessPayloadSchema,
  ReplyStockReservedFailPayloadSchema,
} from '@orchestrator/schemas';
import { eq } from 'drizzle-orm';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, getDbInstance, getProducer, withRetry } from '../_common';

/**
 * Listens to the command_reserve_stock topic and attempts to reserve stock for an order.
 * Validates available quantity, updates the stock record within a transaction,
 * and publishes either a success or failure reply to the orchestrator.
 */
export async function startStockWorker() {
  const consumer = await createConsumer('stock-service-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.COMMAND_RESERVE_STOCK, fromBeginning: false });
    },
    { label: 'Kafka stock consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const payload = parseKafkaMessage(message.value, CommandReserveStockPayloadSchema);

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
              topic: TOPICS.REPLY_STOCK_RESERVED_FAIL,
              messages: [
                {
                  value: JSON.stringify(
                    ReplyStockReservedFailPayloadSchema.parse({
                      idempotencyKey,
                      order,
                      reason: 'Stock not found',
                    }),
                  ),
                },
              ],
            });
            return;
          }

          const hasSufficientStock = stockRecord.availableQuantity >= order.quantity;
          if (!hasSufficientStock) {
            await producer.send({
              topic: TOPICS.REPLY_STOCK_RESERVED_FAIL,
              messages: [
                {
                  value: JSON.stringify(
                    ReplyStockReservedFailPayloadSchema.parse({
                      idempotencyKey,
                      order,
                      reason: 'Insufficient stock',
                    }),
                  ),
                },
              ],
            });
            return;
          }

          await db.transaction(async (tx) => {
            await tx
              .update(stock)
              .set({ reservedQuantity: stockRecord.reservedQuantity + order.quantity })
              .where(eq(stock.id, stockRecord.id));
          });

          await producer.send({
            topic: TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
            messages: [
              {
                value: JSON.stringify(
                  ReplyStockReservedSuccessPayloadSchema.parse({
                    idempotencyKey,
                    order,
                    reservedQuantity: order.quantity,
                  }),
                ),
              },
            ],
          });
        },
      });
    },
    { label: 'Kafka stock consumer run' },
  );
}
