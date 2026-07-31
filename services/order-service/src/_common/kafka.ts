import { Kafka, Producer, Consumer } from "kafkajs";

const kafka = new Kafka({
  clientId: "order-service",
  brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
});

let producer: Producer | null = null;

async function retry<T>(
  fn: () => Promise<T>,
  maxRetries = 15,
  baseDelay = 2000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const delay = baseDelay * (i + 1);
      console.log(
        `Kafka connection attempt ${i + 1}/${maxRetries} failed, retrying in ${delay}ms...`,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

export async function ensureTopicsExist(topics: string[]) {
  await retry(async () => {
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
  });
}

export async function getProducer(): Promise<Producer> {
  if (!producer) {
    producer = kafka.producer();
    await retry(() => producer!.connect());
  }
  return producer;
}

export async function createConsumer(groupId: string): Promise<Consumer> {
  const consumer = kafka.consumer({ groupId });
  await retry(() => consumer.connect());
  return consumer;
}
