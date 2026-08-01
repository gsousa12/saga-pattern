import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { PORTS } from '@orchestrator/constants';

import { AppModule } from './app.module';

const PORT = PORTS.GATEWAY;
const HOST = '0.0.0.0';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  await app.listen(PORT, HOST);
}

bootstrap();
