import { Kafka, Producer, Consumer } from "kafkajs";

export type { Producer, Consumer } from "kafkajs";

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelay?: number;
    label?: string;
  } = {},
): Promise<T> {
  const { maxRetries = 15, baseDelay = 2000, label = "Operation" } = options;
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * (i + 1);
      console.log(
        `${label} attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export function createKafkaClient(clientId: string) {
  const kafka = new Kafka({
    clientId,
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
  });

  let producer: Producer | null = null;

  async function ensureTopicsExist(topics: string[]) {
    await withRetry(async () => {
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
    }, { label: "Kafka ensure topics" });
  }

  async function getProducer(): Promise<Producer> {
    if (!producer) {
      producer = kafka.producer();
      await withRetry(() => producer!.connect(), { label: "Kafka producer connect" });
    }
    return producer;
  }

  async function createConsumer(groupId: string): Promise<Consumer> {
    const consumer = kafka.consumer({ groupId });
    await withRetry(() => consumer.connect(), { label: "Kafka consumer connect" });
    return consumer;
  }

  return { kafka, ensureTopicsExist, getProducer, createConsumer };
}

export type KafkaClient = ReturnType<typeof createKafkaClient>;
