import fastify from "fastify";
import { startStockWorker } from "./workers/stock.worker";
import { ensureTopicsExist } from "./_common/kafka";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist(["command_reserve_stock"]);
    await startStockWorker();
    await app.listen({ port: 3003, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
