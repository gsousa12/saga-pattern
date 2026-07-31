import { createKafkaClient, type Producer } from "@orchestrator/kafka";

const client = createKafkaClient("orchestrator");

export const ensureTopicsExist: typeof client.ensureTopicsExist =
  client.ensureTopicsExist;
export const getProducer: () => Promise<Producer> = client.getProducer;
