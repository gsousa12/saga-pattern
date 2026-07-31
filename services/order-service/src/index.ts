import fastify from "fastify";
import { startOrderWorker } from "./workers/order.worker";
import { ensureTopicsExist } from "./_common/kafka";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist(["orders.create", "orders.created"]);
    await startOrderWorker();
    await app.listen({ port: 3001, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
