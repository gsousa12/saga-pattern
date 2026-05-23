import Fastify from 'fastify';

const app = Fastify({ logger: true });

const _init = async () => {
  try {
    await app.listen({ port: 3002, host: '0.0.0.0' });
    app.log.info('Fees service listening on http://localhost:3002');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

_init();
