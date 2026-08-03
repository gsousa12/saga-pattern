import type { z } from 'zod';

export function parseKafkaMessage<T>(messageValue: Buffer | null, schema: z.ZodSchema<T>): T {
  if (!messageValue) {
    throw new Error('Kafka message value is null or undefined');
  }

  const raw = JSON.parse(messageValue.toString());
  return schema.parse(raw);
}
