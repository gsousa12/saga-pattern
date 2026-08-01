import { createKafkaClient, withRetry, type Consumer, type Producer } from '@orchestrator/kafka';

const client = createKafkaClient('payment-service');

export const ensureTopicsExist: typeof client.ensureTopicsExist = client.ensureTopicsExist;
export const getProducer: () => Promise<Producer> = client.getProducer;
export const createConsumer: (groupId: string) => Promise<Consumer> = client.createConsumer;
export { withRetry };
