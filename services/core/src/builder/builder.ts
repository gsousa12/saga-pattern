import Fastify from "fastify";

const app = Fastify({ logger: true });

export async function builder() {
  await app.listen({ port: 3000, host: "0.0.0.0" });
  app.log.info("Server listening on http://localhost:3000");
}
