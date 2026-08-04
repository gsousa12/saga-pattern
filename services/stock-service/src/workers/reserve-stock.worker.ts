import { TOPICS } from '@orchestrator/constants';
import { stock } from '@orchestrator/db';
import {
  parseKafkaEnvelope,
  buildKafkaMessage,
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

          const { payload } = parseKafkaEnvelope(message.value, CommandReserveStockPayloadSchema);

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
                  value: buildKafkaMessage(
                    ReplyStockReservedFailPayloadSchema.parse({
                      idempotencyKey,
                      order,
                      reason: 'Stock not found',
                    }),
                    {
                      action: 'Stock reservation failed - stock not found',
                      service: 'stock-service',
                      topic: TOPICS.REPLY_STOCK_RESERVED_FAIL,
                      idempotencyKey,
                    },
                  ),
                },
              ],
            });
            return;
          }

          const actualAvailable = stockRecord.availableQuantity - stockRecord.reservedQuantity;
          const hasSufficientStock = actualAvailable >= order.quantity;
          if (!hasSufficientStock) {
            await producer.send({
              topic: TOPICS.REPLY_STOCK_RESERVED_FAIL,
              messages: [
                {
                  value: buildKafkaMessage(
                    ReplyStockReservedFailPayloadSchema.parse({
                      idempotencyKey,
                      order,
                      reason: 'Insufficient stock',
                    }),
                    {
                      action: 'Stock reservation failed - insufficient stock',
                      service: 'stock-service',
                      topic: TOPICS.REPLY_STOCK_RESERVED_FAIL,
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
                availableQuantity: stockRecord.availableQuantity - order.quantity,
                reservedQuantity: stockRecord.reservedQuantity + order.quantity,
              })
              .where(eq(stock.id, stockRecord.id));
          });

          await producer.send({
            topic: TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
            messages: [
              {
                value: buildKafkaMessage(
                  ReplyStockReservedSuccessPayloadSchema.parse({
                    idempotencyKey,
                    order,
                    reservedQuantity: order.quantity,
                  }),
                  {
                    action: 'Stock reserved successfully',
                    service: 'stock-service',
                    topic: TOPICS.REPLY_STOCK_RESERVED_SUCCESS,
                    idempotencyKey,
                  },
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
