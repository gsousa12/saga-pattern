import { z } from 'zod';

/**
 * Log metadata attached to every Kafka message for observability and tracing.
 */
export const KafkaMessageLogSchema = z.object({
  action: z.string().min(1),
  service: z.string().min(1),
  topic: z.string().min(1),
  timestamp: z.string().datetime(),
  idempotencyKey: z.string().min(1),
});

export type KafkaMessageLog = z.infer<typeof KafkaMessageLogSchema>;

/**
 * Standard envelope wrapping every Kafka message value.
 * Separates business payload from operational metadata.
 */
export const KafkaMessageEnvelopeSchema = z.object({
  payload: z.unknown(),
  log: KafkaMessageLogSchema,
});

export type KafkaMessageEnvelope = z.infer<typeof KafkaMessageEnvelopeSchema>;

/**
 * Builds a Kafka message value string with the standard envelope format.
 *
 * @param payload - The business payload object (already validated by its schema).
 * @param logInfo - Log metadata excluding timestamp (added automatically).
 * @returns JSON string ready for Kafka `messages[].value`.
 */
export function buildKafkaMessage<T>(
  payload: T,
  logInfo: Omit<KafkaMessageLog, 'timestamp'>,
): string {
  return JSON.stringify({ payload, log: { ...logInfo, timestamp: new Date().toISOString() } });
}

/**
 * Parses a Kafka message envelope, validates the payload against the given schema,
 * and returns both the typed payload and the log metadata.
 *
 * @param messageValue - Raw Kafka message value (Buffer or null).
 * @param payloadSchema - Zod schema for the business payload.
 * @returns Object with `payload` (typed) and `log` (metadata).
 */
export function parseKafkaEnvelope<T>(
  messageValue: Buffer | null,
  payloadSchema: z.ZodSchema<T>,
): { payload: T; log: KafkaMessageLog } {
  if (!messageValue) {
    throw new Error('Kafka message value is null or undefined');
  }

  const raw = JSON.parse(messageValue.toString());
  const envelope = KafkaMessageEnvelopeSchema.parse(raw);
  const payload = payloadSchema.parse(envelope.payload);

  return { payload, log: envelope.log };
}
