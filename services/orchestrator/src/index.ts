import fastify from "fastify";
import { PORTS, TOPICS } from "@orchestrator/constants";
import { startSagaWorker } from "./workers/saga.worker";
import { ensureTopicsExist } from "./_common/kafka";

const PORT = PORTS.ORCHESTRATOR;
const HOST = "0.0.0.0";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      TOPICS.SAGA_START_CHECKOUT,
      TOPICS.COMMAND_RESERVE_STOCK,
    ]);
    await startSagaWorker();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
