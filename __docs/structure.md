# Estrutura e Padroes do Projeto

## Objetivo

Implementacao de **Saga Pattern (Orchestrator)** sem frameworks externos. Comunicacao via **Kafka** e HTTP interno. Um unico banco PostgreSQL compartilhado. Monorepo pnpm.

## Arquitetura

```
orchestrator/
├── packages/                 # Codigo compartilhado (sem logica de negocio)
│   ├── db/                   # Drizzle ORM: schemas, conexao, migrations
│   ├── kafka/                # KafkaJS: factory + retry + re-export de tipos
│   ├── enums/                # Constantes e enums puros
│   ├── constants/            # Constantes globais: PORTS, TOPICS, DEFAULTS
│   └── types/                # Tipagens TypeScript puras (LEGADO, nao usado no fluxo atual)
├── services/                 # Workers Fastify (sem endpoints CRUD, exceto health)
│   ├── orchestrator/         # Saga orchestrator: consome eventos, publica comandos, grava saga_state
│   ├── order-service/        # Cria orders via HTTP, publica saga_start_checkout
│   ├── stock-service/        # Consome command_reserve_stock, publica reply_stock_reserved_success/fail
│   ├── payment-service/      # Consome command_process_payment, publica reply_payment_success/fail
│   └── notification-service/ # Stub
├── apps/                     # Aplicacoes de entrada
│   └── gateway/              # NestJS: expoe endpoints HTTP para o cliente
├── __http/                   # Arquivos .http para testar endpoints
├── __docs/                   # Documentacao interna
├── docker-compose.yml        # Postgres + Kafka + pgAdmin + Redpanda Console
├── Dockerfile.migrate        # Container de migrations (pnpm + drizzle)
├── tsconfig.base.json        # Shared TS config
└── pnpm-workspace.yaml       # Monorepo: packages/*, services/*, apps/*
```

## Packages

### `@orchestrator/db`

- **Schemas:** `products`, `orders`, `stock`, `saga_states`
- **Conexao:** `createDb(url)` retorna `DbInstance` (drizzle-node-postgres)
- **Migrations:** `packages/db/src/drizzle/*.sql` + `meta/_journal.json`
- **Exporta tipos:** `Order`, `OrderInsert`, `Stock`, `StockInsert`, `SagaState`, `SagaStateInsert`
- **Regra:** todo service que acessa DB importa `@orchestrator/db` e cria seu proprio `_common/db.ts` (singleton lazy)

### `@orchestrator/kafka`

- **`createKafkaClient(clientId)`** — retorna `{ ensureTopicsExist, getProducer, createConsumer }`
- **`withRetry(fn, options)`** — retry com backoff (maxRetries=15, baseDelay=2000ms)
- **Re-exporta tipos:** `Producer`, `Consumer` (de `kafkajs`) para evitar `TS2742`
- **Regra:** cada service cria um thin wrapper `src/_common/kafka.ts` que chama `createKafkaClient("<service-name>")`

### `@orchestrator/enums`

- `OrderStatusEnum` / `OrderStatusType` — `pending`, `completed`, `cancelled`
- `SagaTypeEnum` / `SagaTypeType` — `checkout_process`
- `SagaStepEnum` / `SagaStepType` — `pending_stock`, `pending_payment`, `completed`, `rollbacking_stock`, `failed`
- Usado pelos schemas do DB (pgEnum) e pelos workers

### `@orchestrator/constants`

- **`PORTS`** — portas centralizadas de todos os servicos
- **`TOPICS`** — nomes dos topicos Kafka centralizados
- **`DEFAULTS`** — valores default de env vars

## Services (Workers Fastify)

Todos os services sao **workers** — rodam Fastify na porta X apenas para health check e workers Kafka. Nao expoem endpoints CRUD.

### orchestrator (porta 3002)

- **Workers:**
  - `startSagaWorker` — consome `saga_start_checkout`, insere `saga_states` (currentStep=`pending_stock`), publica `command_reserve_stock`
  - `startStockSuccessWorker` — consome `reply_stock_reserved_success`, atualiza saga para `pending_payment`, publica `command_process_payment`
  - `startStockFailWorker` — consome `reply_stock_reserved_fail`, marca saga como `failed`
  - `startPaymentSuccessWorker` — consome `reply_payment_success`, marca saga como `completed`
  - `startPaymentFailWorker` — consome `reply_payment_fail`, marca saga como `rollbacking_stock` (TODO: publicar `command_release_stock`)
- **Arquivos:** `src/index.ts`, `src/workers/saga.worker.ts`, `src/_common/kafka.ts`, `src/_common/db.ts`

### order-service (porta 3003)

- **Endpoint HTTP:** `POST /checkout` (recebe do gateway)
- **Body:** `{ idempotencyKey, productId, quantity }`
- **Acoes:** cria order no DB via **transaction**, publica `saga_start_checkout` com `{ idempotencyKey, order }`
- **Arquivos:** `src/index.ts`, `src/_common/db.ts`, `src/_common/kafka.ts`

### stock-service (porta 3004)

- **Tópicos:** consome `command_reserve_stock`, publica `reply_stock_reserved_success` ou `reply_stock_reserved_fail`
- **Status:** stub — loga as mensagens recebidas (nao implementa logica de reserva real ainda)
- **Arquivos:** `src/index.ts`, `src/workers/stock.worker.ts`, `src/_common/kafka.ts`, `src/_common/db.ts`

### payment-service (porta 3005)

- **Tópicos:** consome `command_process_payment`, publica `reply_payment_success` ou `reply_payment_fail`
- **Status:** stub — loga as mensagens recebidas (nao implementa logica de pagamento real ainda)
- **Arquivos:** `src/index.ts`, `src/workers/payment.worker.ts`, `src/_common/kafka.ts`

### notification-service (porta 3006)

- Stub. Roda Fastify health check. Sem workers ativos.

## Apps

### gateway (porta 3001) — NestJS

- **Framework:** NestJS com `@nestjs/platform-fastify`
- **Responsabilidade:** unico ponto de entrada HTTP para o cliente
- **Controllers:**
  - `GET /products`, `POST /products` (stub)
  - `GET /orders`, `POST /orders` (stub)
  - `POST /checkout` → chama `order-service:3003/checkout` via **axios**
- **Modules:** `AppModule` importa `CheckoutModule` (controller + service)
- **Env:** `ORDER_SERVICE_URL` (default `http://localhost:3003`)

## Fluxo de Checkout (Saga)

```
Cliente -> Gateway (POST /checkout) :3001
  -> HTTP -> Order Service (POST /checkout) :3003
     -> INSERT orders (transaction)
     -> PUBLISH saga_start_checkout { idempotencyKey, order }
        -> Kafka -> Orchestrator :3002 (startSagaWorker)
           -> INSERT saga_states (transaction, currentStep=pending_stock)
           -> PUBLISH command_reserve_stock { idempotencyKey, order }
              -> Kafka -> Stock Service :3004
                 -> (reserva stock)
                 -> PUBLISH reply_stock_reserved_success { idempotencyKey, order }
                    -> Kafka -> Orchestrator :3002 (startStockSuccessWorker)
                       -> UPDATE saga_states currentStep=pending_payment
                       -> PUBLISH command_process_payment { idempotencyKey, order }
                          -> Kafka -> Payment Service :3005
                             -> (processa pagamento)
                             -> PUBLISH reply_payment_success { idempotencyKey, order }
                                -> Kafka -> Orchestrator :3002 (startPaymentSuccessWorker)
                                   -> UPDATE saga_states currentStep=completed

Caminhos de falha:

Stock Service -> reply_stock_reserved_fail { idempotencyKey, order, reason }
  -> Orchestrator :3002 (startStockFailWorker)
     -> UPDATE saga_states currentStep=failed

Payment Service -> reply_payment_fail { idempotencyKey, order, reason }
  -> Orchestrator :3002 (startPaymentFailWorker)
     -> UPDATE saga_states currentStep=rollbacking_stock
     -> (TODO: PUBLISH command_release_stock)
```

## Banco de Dados

| Tabela        | Colunas principais                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------- |
| `products`    | id, name, price, description, createdAt, updatedAt, deletedAt                                                   |
| `orders`      | id, productId, quantity, totalPrice, status (enum), createdAt, updatedAt, deletedAt                             |
| `stock`       | id, productId, availableQuantity, reservedQuantity, createdAt, updatedAt, deletedAt                             |
| `saga_states` | id, idempotencyKey (unique), businessId, type (enum), currentStep (enum), payload (jsonb), createdAt, updatedAt |

**Regra:** toda operacao de INSERT/UPDATE no DB deve estar dentro de `db.transaction(async (tx) => { ... })`.

## Kafka — Tópicos

| Topico                         | Produtor        | Consumidor      | Payload                             |
| ------------------------------ | --------------- | --------------- | ----------------------------------- |
| `saga_start_checkout`          | order-service   | orchestrator    | `{ idempotencyKey, order }`         |
| `command_reserve_stock`        | orchestrator    | stock-service   | `{ idempotencyKey, order }`         |
| `reply_stock_reserved_success` | stock-service   | orchestrator    | `{ idempotencyKey, order }`         |
| `reply_stock_reserved_fail`    | stock-service   | orchestrator    | `{ idempotencyKey, order, reason }` |
| `command_process_payment`      | orchestrator    | payment-service | `{ idempotencyKey, order }`         |
| `reply_payment_success`        | payment-service | orchestrator    | `{ idempotencyKey, order }`         |
| `reply_payment_fail`           | payment-service | orchestrator    | `{ idempotencyKey, order, reason }` |

**Regra:** cada service chama `ensureTopicsExist([...])` no startup para criar tópicos automaticamente.

## Conventions de Código

### Thin Wrappers nos Services

Cada service tem `src/_common/kafka.ts` e `src/_common/db.ts`. O kafka.ts é um thin wrapper de ~5 linhas sobre `@orchestrator/kafka`:

```ts
import { createKafkaClient, type Producer } from '@orchestrator/kafka';
const client = createKafkaClient('<service-name>');
export const ensureTopicsExist = client.ensureTopicsExist;
export const getProducer: () => Promise<Producer> = client.getProducer;
```

### tsconfig dos Services

Services sao aplicacoes finais. **Sem `declaration`:**

```json
{ "compilerOptions": { "declaration": false, "declarationMap": false } }
```

Isso evita `TS2742: The inferred type cannot be named without a reference...`

### Environment Variables

| Var                 | Default                                                      | Usado em                    |
| ------------------- | ------------------------------------------------------------ | --------------------------- |
| `DATABASE_URL`      | `postgresql://postgres:postgres@localhost:5432/orchestrator` | todos os services com DB    |
| `KAFKA_BROKERS`     | `localhost:9092`                                             | todos os services com Kafka |
| `ORDER_SERVICE_URL` | `http://localhost:3003`                                      | gateway                     |

## Infra — Docker Compose

- **postgres:** `postgres:15-alpine`, porta 5432, healthcheck `pg_isready`
- **kafka:** `apache/kafka:3.7.0`, KRaft mode, porta 9092 (external) + 29092 (internal), healthcheck via `kafka-broker-api-versions.sh`
- **migrate:** builda `Dockerfile.migrate` e roda `pnpm db:migrate`
- **pgadmin:** porta 5050
- **redpanda-console:** porta 8080, conecta em `kafka:29092`

**Atencao:** o `Dockerfile.migrate` deve copiar **todos** os workspace packages que `@orchestrator/db` depende (incluindo `@orchestrator/enums`) mais o `pnpm-lock.yaml`, e rodar `pnpm install --frozen-lockfile`.

## Comandos

```bash
# Instalar deps do monorepo
pnpm install

# Compilar todos os workspaces
pnpm build

# Rodar todos os servicos em paralelo (gateway + services)
pnpm run dev:all

# Rodar individualmente
pnpm run dev:gateway       # NestJS gateway :3001
pnpm run dev:orchestrator    # orchestrator :3002
pnpm run dev:order           # order-service :3003
pnpm run dev:stock           # stock-service :3004
pnpm run dev:payment         # payment-service :3005
pnpm run dev:notification    # notification-service :3006

# Banco
pnpm db:generate    # gerar migration (manual se o drizzle-kit interativo falhar)
pnpm db:migrate     # aplicar migrations localmente
pnpm db:studio      # Drizzle Studio

# Docker
docker compose up -d           # subir infra (postgres, kafka, etc.)
docker compose up migrate      # rodar migrations no container
```

## Ports

| Service/App          | Porta |
| -------------------- | ----- |
| gateway (NestJS)     | 3001  |
| orchestrator         | 3002  |
| order-service        | 3003  |
| stock-service        | 3004  |
| payment-service      | 3005  |
| notification-service | 3006  |

**Fonte:** `packages/constants/src/index.ts` → `PORTS`.

## HTTP Test Files

Pasta `__http/`:

- `gateway/checkout.http` — **fluxo atual:** POST `/checkout` com `{ idempotencyKey, productId, quantity }`

Use com VS Code REST Client ou JetBrains.

## Checklist para Modificacoes Futuras

- [ ] Alterou schema? → `pnpm db:generate` (ou manual SQL) + `pnpm db:migrate` + rebuild `@orchestrator/db`
- [ ] Alterou enums? → rebuild `@orchestrator/enums` antes de rebuildar `@orchestrator/db`
- [ ] Alterou ports? → atualizar `packages/constants/src/index.ts` + `__docs/structure.md` + `docker-compose.yml` se necessario
- [ ] Novo service com Kafka? → thin wrapper `src/_common/kafka.ts`, chamar `ensureTopicsExist([...])` no startup
- [ ] Novo service com DB? → thin wrapper `src/_common/db.ts`, usar `db.transaction()` em inserts/updates
- [ ] Novo topico Kafka? → adicionar em `packages/constants/src/index.ts` (TOPICS) + atualizar `__docs/structure.md`
- [ ] Adicionou workspace? → incluir em `pnpm-workspace.yaml` e `package.json` root scripts
