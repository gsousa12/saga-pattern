import Fastify from 'fastify';

const app = Fastify({ logger: true });

const _init = async () => {
  try {
    await app.listen({ port: 3001, host: '0.0.0.0' });
    app.log.info('Exchanges service listening on http://localhost:3001');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

_init();
