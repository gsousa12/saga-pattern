# Orchestrator Saga

Implementation of the **Saga Pattern (Orchestrator)** without external frameworks.

This is a **study project** that simulates a distributed order checkout flow across multiple microservices, coordinated by a central orchestrator via Kafka.

## What is the Saga Pattern?

Saga is a design pattern for managing distributed transactions. Instead of a single ACID transaction, the flow is divided into independent steps. If any step fails, compensation actions (rollbacks) are executed to undo what has already been done.

## Stack

- **Node.js + TypeScript**
- **Fastify** (HTTP APIs for services)
- **NestJS** (Gateway API)
- **Drizzle ORM** (PostgreSQL)
- **Kafka + KafkaJS** (messaging between services)
- **pnpm workspaces** (monorepo)
- **Zod** (validation and inferred types)
- **Docker + Docker Compose** (infrastructure)

## Architecture

Monorepo organized into three layers:

```
orchestrator/
├── packages/       # Shared code (no business logic)
│   ├── db/         # Drizzle ORM: connection, schemas, migrations
│   ├── kafka/      # KafkaJS: factory, retry, re-exports
│   ├── schemas/    # Zod: validation + inferred types (DTOs, Kafka payloads)
│   ├── enums/      # Pure enums and constants
│   └── constants/  # Global constants: PORTS, TOPICS, DEFAULTS
├── services/       # Fastify workers (health check + Kafka consumers)
│   ├── orchestrator/
│   ├── order-service/
│   ├── stock-service/
│   ├── payment-service/
│   └── notification-service/
└── apps/
    └── gateway/    # NestJS: HTTP endpoints for the client
```

## Services

| Service              | Port | Responsibility                              |
| -------------------- | ---- | ------------------------------------------- |
| gateway              | 3001 | NestJS API Gateway                          |
| orchestrator         | 3002 | Coordinates the saga flow via Kafka         |
| order-service        | 3003 | Creates orders and syncs final status       |
| stock-service        | 3004 | Inventory control (reserve / release stock) |
| payment-service      | 3005 | Payment stub (80% simulated success rate)   |
| notification-service | 3006 |                                             |

## Prerequisites

- Node.js 20+
- pnpm
- Docker + Docker Compose
- PostgreSQL and Kafka (provided via Docker Compose)

## Setup

### 1. Start infrastructure

```bash
# PostgreSQL and Kafka
docker compose up -d
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Build all packages

```bash
pnpm build
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Start all services

```bash
# Option A: parallel dev mode
pnpm dev:all

# Option B: individual services
pnpm dev:gateway
pnpm dev:orchestrator
pnpm dev:order
pnpm dev:stock
pnpm dev:payment
```

## Available Scripts

| Script            | Description                             |
| ----------------- | --------------------------------------- |
| `pnpm build`      | Build all workspace packages            |
| `pnpm dev:all`    | Start all services in parallel dev mode |
| `pnpm db:migrate` | Run Drizzle migrations                  |
| `pnpm db:studio`  | Open Drizzle Studio                     |
| `pnpm lint`       | Run oxlint on all files                 |
| `pnpm lint:fix`   | Auto-fix oxlint issues                  |
| `pnpm fmt`        | Format code with oxfmt                  |
| `pnpm fmt:check`  | Check formatting                        |

## License

MIT
