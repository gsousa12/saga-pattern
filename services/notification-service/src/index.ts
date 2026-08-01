import fastify from "fastify";
import { DEFAULTS, PORTS } from "@orchestrator/constants";
const app = fastify({ logger: true });

const PORT = PORTS.NOTIFICATION_SERVICE;
const HOST = "0.0.0.0";

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Defaults loaded: ${DEFAULTS.DATABASE_URL}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
