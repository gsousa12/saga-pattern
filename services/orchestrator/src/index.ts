import fastify from "fastify";
import { startSagaWorker } from "./workers/saga.worker";
import { ensureTopicsExist } from "./_common/kafka";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist([
      "saga_start_checkout",
      "command_reserve_stock",
    ]);
    await startSagaWorker();
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
