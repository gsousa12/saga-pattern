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
│   └── types/                # Tipagens TypeScript puras (LEGADO, nao usado no fluxo atual)
├── services/                 # Workers Fastify (sem endpoints CRUD, exceto health)
│   ├── orchestrator/         # Saga orchestrator: consome eventos, publica comandos, grava saga_state
│   ├── order-service/        # Cria orders via HTTP, publica saga_start_checkout
│   ├── stock-service/        # Consome command_reserve_stock (stub)
│   ├── payment-service/      # Stub
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
- `SagaStepEnum` / `SagaStepType` — `pending_stock`, `pending_payment`, `completed`, `rollbacking_stock`
- Usado pelos schemas do DB (pgEnum) e pelos workers

## Services (Workers Fastify)

Todos os services sao **workers** — rodam Fastify na porta X apenas para health check e workers Kafka. Nao expoem endpoints CRUD.

### orchestrator (porta 3000)

- **Tópicos:** consome `saga_start_checkout`, publica `command_reserve_stock`
- **Acoes:** ao receber `saga_start_checkout`, insere `saga_states` (currentStep=`pending_stock`) via **transaction**, depois publica `command_reserve_stock`
- **Arquivos:** `src/index.ts`, `src/workers/saga.worker.ts`, `src/_common/kafka.ts`

### order-service (porta 3001)

- **Endpoint HTTP:** `POST /checkout` (recebe do gateway)
- **Body:** `{ idempotencyKey, productId, quantity }`
- **Acoes:** cria order no DB via **transaction**, publica `saga_start_checkout` com `{ idempotencyKey, order }`
- **Worker legado:** consome `orders.create` (topico antigo, ainda rodando)
- **Arquivos:** `src/index.ts`, `src/workers/order.worker.ts`, `src/_common/db.ts`, `src/_common/kafka.ts`

### stock-service (porta 3003)

- **Tópicos:** consome `command_reserve_stock` (stub — so loga por enquanto)
- **Arquivos:** `src/index.ts`, `src/workers/stock.worker.ts`, `src/_common/kafka.ts`, `src/_common/db.ts`

### payment-service / notification-service

- Stubs. Roda Fastify health check na porta 3002 e 3004. Sem workers ativos.

## Apps

### gateway (porta 3002) — NestJS

- **Framework:** NestJS com `@nestjs/platform-fastify`
- **Responsabilidade:** unico ponto de entrada HTTP para o cliente
- **Controllers:**
  - `GET /products`, `POST /products` (stub)
  - `GET /orders`, `POST /orders` (stub)
  - `POST /checkout` → chama `order-service:3001/checkout` via **axios**
- **Modules:** `AppModule` importa `CheckoutModule` (controller + service)
- **Env:** `ORDER_SERVICE_URL` (default `http://localhost:3001`)

## Fluxo de Checkout (Saga)

```
Cliente -> Gateway (POST /checkout)
  -> HTTP -> Order Service (POST /checkout)
     -> INSERT orders (transaction)
     -> PUBLISH saga_start_checkout { idempotencyKey, order }
        -> Kafka -> Orchestrator (saga worker)
           -> INSERT saga_states (transaction, currentStep=pending_stock)
           -> PUBLISH command_reserve_stock { idempotencyKey, order }
              -> Kafka -> Stock Service (stub)
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

| Topico                  | Produtor      | Consumidor    | Payload                     |
| ----------------------- | ------------- | ------------- | --------------------------- |
| `saga_start_checkout`   | order-service | orchestrator  | `{ idempotencyKey, order }` |
| `command_reserve_stock` | orchestrator  | stock-service | `{ idempotencyKey, order }` |

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
| `ORDER_SERVICE_URL` | `http://localhost:3001`                                      | gateway                     |

## Infra — Docker Compose

- **postgres:** `postgres:15-alpine`, porta 5432, healthcheck `pg_isready`
- **kafka:** `apache/kafka:3.7.0`, KRaft mode, porta 9092 (external) + 29092 (internal), healthcheck via `kafka-broker-api-versions.sh`
- **migrate:** builda `Dockerfile.migrate` e roda `pnpm db:migrate`
- **pgadmin:** porta 5050
- **redpanda-console:** porta 8080, conecta em `kafka:29092`

**Atenção:** o `Dockerfile.migrate` deve copiar **todos** os workspace packages que `@orchestrator/db` depende (incluindo `@orchestrator/enums`) mais o `pnpm-lock.yaml`, e rodar `pnpm install --frozen-lockfile`.

## Comandos

```bash
# Instalar deps do monorepo
pnpm install

# Compilar todos os workspaces
pnpm build

# Rodar todos os servicos em paralelo (gateway + services)
pnpm run dev:all

# Rodar individualmente
pnpm run dev:gateway       # NestJS gateway :3002
pnpm run dev:orchestrator    # orchestrator :3000
pnpm run dev:order           # order-service :3001
pnpm run dev:stock           # stock-service :3003

# Banco
pnpm db:generate    # gerar migration (manual se o drizzle-kit interativo falhar)
pnpm db:migrate     # aplicar migrations localmente
pnpm db:studio      # Drizzle Studio

# Docker
docker compose up -d           # subir infra (postgres, kafka, etc.)
docker compose up migrate      # rodar migrations no container
```

## Ports

| Service/App          | Porta                                                  |
| -------------------- | ------------------------------------------------------ |
| orchestrator         | 3000                                                   |
| order-service        | 3001                                                   |
| gateway (NestJS)     | 3002                                                   |
| stock-service        | 3003                                                   |
| payment-service      | 3002 (stub, nao conflita pq nao roda junto no dev:all) |
| notification-service | 3004 (stub)                                            |

**Nota:** o payment-service esta na porta 3002 (mesma do gateway), mas ambos sao stubs que nao rodam simultaneamente no `dev:all`. Gateway roda na 3002.

## HTTP Test Files

Pasta `__http/`:

- `orchestrator/order.create.http` — stub antigo
- `orchestrator/product.create.http` — stub antigo
- `gateway/checkout.http` — **fluxo atual:** POST `/checkout` com `{ idempotencyKey, productId, quantity }`

Use com VS Code REST Client ou JetBrains.

## Checklist para Modificacoes Futuras

- [ ] Alterou schema? → `pnpm db:generate` (ou manual SQL) + `pnpm db:migrate` + rebuild `@orchestrator/db`
- [ ] Alterou enums? → rebuild `@orchestrator/enums` antes de rebuildar `@orchestrator/db`
- [ ] Novo service com Kafka? → thin wrapper `src/_common/kafka.ts`, chamar `ensureTopicsExist([...])` no startup
- [ ] Novo service com DB? → thin wrapper `src/_common/db.ts`, usar `db.transaction()` em inserts/updates
- [ ] Adicionou workspace? → incluir em `pnpm-workspace.yaml` e `package.json` root scripts
