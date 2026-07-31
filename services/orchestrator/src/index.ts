import fastify from "fastify";
import { registerRoutes } from "./router/router";
import { ensureTopicsExist } from "./_common/kafka";

const app = fastify({ logger: true });

app.get("/health", async () => {
  return { status: "ok" };
});

const start = async () => {
  try {
    await ensureTopicsExist(["orders.create"]);
    await registerRoutes(app);
    await app.listen({ port: 3000, host: "0.0.0.0" });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
