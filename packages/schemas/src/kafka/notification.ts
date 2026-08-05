import { z } from 'zod';

export const SagaNotificationPayloadSchema = z.object({
  idempotencyKey: z.string().min(1),
  status: z.string().min(1),
  message: z.string().min(1),
  timestamp: z.string().datetime(),
});

export type SagaNotificationPayload = z.infer<typeof SagaNotificationPayloadSchema>;

export function buildSagaNotificationPayload(
  idempotencyKey: string,
  status: string,
  message: string,
): SagaNotificationPayload {
  return { idempotencyKey, status, message, timestamp: new Date().toISOString() };
}
