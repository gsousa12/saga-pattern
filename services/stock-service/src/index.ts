import fastify from "fastify";
import { PORTS, TOPICS } from "@orchestrator/constants";
import { startStockWorker } from "./workers/stock.worker";
import { ensureTopicsExist } from "./_common/kafka";

const PORT = PORTS.STOCK_SERVICE;
const HOST = "0.0.0.0";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist([TOPICS.COMMAND_RESERVE_STOCK]);
    await startStockWorker();
    await app.listen({ port: PORT, host: HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
