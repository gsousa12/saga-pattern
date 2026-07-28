# Estrutura e Padroes do Projeto

## Objetivo

Este projeto e uma implementacao de **Saga Pattern (Orchestrator)** sem dependencia de frameworks externos como Temporal.io. Cada service e independente, se comunica via HTTP interno (e futuramente via Kafka) e o orchestrator central coordena o fluxo de execucao.

## Arquitetura

```
orchestrator/
├── packages/                # Codigo compartilhado entre services
│   ├── enums/              # Constantes e enums puros (ex: OrderStatus)
│   ├── types/              # Tipagens TypeScript puras (entidades, payloads)
│   └── db/                 # Drizzle ORM: schemas, conexao e migrations
├── services/               # APIs Fastify independentes
│   ├── orchestrator/       # Coordenador central do saga
│   ├── order-service/      # Gerencia pedidos
│   ├── payment-service/    # Processa pagamentos
│   ├── stock-service/      # Controle de estoque
│   └── notification-service/ # Notificacoes (email, push, etc.)
├── __http/                 # Arquivos .http para testar endpoints via REST Client
├── __docs/                 # Documentacao interna
├── docker-compose.yml      # Postgres + Kafka + pgAdmin + Redpanda Console
└── pnpm-workspace.yaml     # Configuracao do monorepo
```

## Regras de Organizacao

### 1. Packages sao ONLY shared code

- **Nunca** coloque logica de negocio dentro de `packages/`.
- Um package deve ser importavel por qualquer service sem efeitos colaterais.

### 2. Services NAO compartilham codigo entre si

- Se `order-service` precisa de um type de `payment-service`, ele importa de `@orchestrator/types`.
- Services se comunicam via **HTTP** ou **Kafka**, nunca via import direta.

### 3. Tipagens vs Schemas

| Onde                  | O que                              | Exemplo                              |
| --------------------- | ---------------------------------- | ------------------------------------ |
| `@orchestrator/types` | Tipagens puras (interfaces, types) | `Product`, `Order`, `Batch`          |
| `@orchestrator/db`    | Drizzle schemas + conexao          | `products`, `orders`, `batches`      |
| `@orchestrator/enums` | Constantes/Enums sem runtime cost  | `OrderStatusEnum`, `OrderStatusType` |

**Regra de ouro:** Se voce precisa tipar um payload de API, use `@orchestrator/types`. Se voce precisa fazer uma query no banco, use `@orchestrator/db`.

### 4. Padrao de Entidades

Toda entidade segue a mesma estrutura:

```ts
export type Entity = {
  id: string;
  // campos especificos
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateEntity = Omit<
  Entity,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;
```

Isso garante consistencia entre banco, API e tipagem.

### 5. Banco de Dados

- O PostgreSQL e compartilhado por todos os services (um unico banco `orchestrator`).
- Cada service pode ter suas proprias tabelas, mas todas sao definidas no package `@orchestrator/db`.
- Migrations sao versionadas e commitadas em `packages/db/src/drizzle/`.

### 6. Comandos Padrao

```bash
# Instalar dependencias de todo o monorepo
pnpm install

# Compilar todos os workspaces
pnpm build

# Rodar todos os services em paralelo
pnpm dev:all

# Rodar um service especifico
pnpm dev:order

# Banco de dados
pnpm db:generate    # gerar migration apos alterar schema
pnpm db:migrate     # aplicar migrations localmente
pnpm db:studio      # abrir Drizzle Studio

# Docker (infraestrutura)
docker compose up -d           # subir postgres, kafka, pgadmin, redpanda
docker compose up migrate      # aplicar migrations no container
```

### 7. Ports dos Services

| Service              | Porta |
| -------------------- | ----- |
| orchestrator         | 3000  |
| order-service        | 3001  |
| payment-service      | 3002  |
| stock-service        | 3003  |
| notification-service | 3004  |

### 8. Kafka e Saga

- O Kafka e usado para eventos assincronos entre services.
- O orchestrator publica comandos (ex: `ProcessPayment`) e escuta eventos (ex: `PaymentCompleted`).
- Cada service consome seu proprio topico e publica o resultado.

### 9. Testes via REST Client

A pasta `__http/` contem arquivos `.http` prontos para uso com:

- VS Code + extensao REST Client
- JetBrains IDEs (WebStorm, IntelliJ)

Basta abrir o arquivo e clicar em "Send Request".
