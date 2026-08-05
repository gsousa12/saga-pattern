import { TOPICS } from '@orchestrator/constants';
import { parseKafkaEnvelope, SagaNotificationPayloadSchema } from '@orchestrator/schemas';
import type { EachMessagePayload } from 'kafkajs';

import { createConsumer, withRetry } from '../_common';

export interface SagaNotification {
  status: string;
  message: string;
  timestamp: string;
}

const notifications = new Map<string, SagaNotification[]>();
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>();

const CLEANUP_MS = 5 * 60 * 1000;

export function getNotifications(idempotencyKey: string): SagaNotification[] {
  return notifications.get(idempotencyKey) || [];
}

export function clearNotifications(idempotencyKey: string): void {
  notifications.delete(idempotencyKey);
  const timer = cleanupTimers.get(idempotencyKey);
  if (timer) {
    clearTimeout(timer);
    cleanupTimers.delete(idempotencyKey);
  }
}

function addNotification(idempotencyKey: string, notification: SagaNotification): void {
  const existing = notifications.get(idempotencyKey) || [];
  existing.push(notification);
  notifications.set(idempotencyKey, existing);

  const timer = cleanupTimers.get(idempotencyKey);
  if (timer) {
    clearTimeout(timer);
  }

  cleanupTimers.set(
    idempotencyKey,
    setTimeout(() => {
      notifications.delete(idempotencyKey);
      cleanupTimers.delete(idempotencyKey);
    }, CLEANUP_MS),
  );
}

export async function startNotificationWorker() {
  const consumer = await createConsumer('notification-service-group');

  await withRetry(
    async () => {
      await consumer.subscribe({ topic: TOPICS.SAGA_NOTIFICATION, fromBeginning: false });
    },
    { label: 'Kafka notification consumer subscribe' },
  );

  await withRetry(
    async () => {
      await consumer.run({
        eachMessage: async ({ message }: EachMessagePayload) => {
          if (!message.value) return;

          const { payload } = parseKafkaEnvelope(message.value, SagaNotificationPayloadSchema);

          addNotification(payload.idempotencyKey, {
            status: payload.status,
            message: payload.message,
            timestamp: payload.timestamp,
          });
        },
      });
    },
    { label: 'Kafka notification consumer run' },
  );
}
