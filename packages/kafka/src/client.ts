import { Kafka } from 'kafkajs';
import type { Producer, Consumer } from 'kafkajs';

import { withRetry } from './with-retry';

export type { Producer, Consumer } from 'kafkajs';

export function createKafkaClient(clientId: string) {
  const kafka = new Kafka({
    clientId,
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  });

  let producer: Producer | null = null;

  async function ensureTopicsExist(topics: string[]) {
    await withRetry(
      async () => {
        const admin = kafka.admin();
        await admin.connect();
        const existingTopics = await admin.listTopics();
        const topicsToCreate = topics.filter((t) => !existingTopics.includes(t));
        if (topicsToCreate.length > 0) {
          await admin.createTopics({
            topics: topicsToCreate.map((topic) => ({
              topic,
              numPartitions: 1,
              replicationFactor: 1,
            })),
          });
        }
        await admin.disconnect();
      },
      { label: 'Kafka ensure topics' },
    );
  }

  async function getProducer(): Promise<Producer> {
    if (!producer) {
      producer = kafka.producer();
      await withRetry(() => producer!.connect(), { label: 'Kafka producer connect' });
    }
    return producer;
  }

  async function createConsumer(groupId: string): Promise<Consumer> {
    const consumer = kafka.consumer({ groupId });
    await withRetry(() => consumer.connect(), { label: 'Kafka consumer connect' });
    return consumer;
  }

  return { kafka, ensureTopicsExist, getProducer, createConsumer };
}

export type KafkaClient = ReturnType<typeof createKafkaClient>;
