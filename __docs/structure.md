# Estrutura e Padrões do Projeto

## Visão Geral

Implementação de **Saga Pattern (Orchestrator)** sem frameworks externos. Monorepo pnpm.
Comunicação via **Kafka** e HTTP interno. Banco **PostgreSQL** compartilhado.

## Arquitetura de Pastas

```
orchestrator/
├── packages/       # Código compartilhado (sem lógica de negócio)
│   ├── db/         # Drizzle ORM: conexão, schemas, migrations
│   ├── kafka/      # KafkaJS: factory, retry, re-export de tipos
│   ├── schemas/    # Zod: validação + types inferidos (DTOs, Kafka payloads)
│   ├── enums/      # Enums e constantes puras
│   └── constants/  # Constantes globais: PORTS, TOPICS, DEFAULTS
├── services/       # Workers Fastify (health check + Kafka workers)
│   ├── orchestrator/
│   ├── order-service/
│   ├── stock-service/
│   ├── payment-service/
│   └── notification-service/
└── apps/
    └── gateway/    # NestJS: endpoints HTTP para o cliente
```

## Regras de Packages

### `@orchestrator/db`

- Toda operação de **INSERT/UPDATE** deve estar dentro de `db.transaction(async (tx) => { ... })`.
- Services criam seu próprio `src/_common/db.ts` (singleton lazy).

### `@orchestrator/kafka`

- Cada service cria um **thin wrapper** `src/_common/kafka.ts` chamando `createKafkaClient("<service-name>")`.
- Cada service chama `ensureTopicsExist([...])` no startup.

### `@orchestrator/schemas`

- Nenhum schema ou DTO deve ficar dentro de `services/` ou `apps/`. Toda validação de entrada (HTTP body ou Kafka message) usa `@orchestrator/schemas`.
- **Regra (enums):** schemas que referenciam enum values devem importar os arrays `*_VALUES` de `@orchestrator/enums` (ex: `z.enum(ORDER_STATUS_VALUES)`). Nunca hardcodar strings de enum dentro de schemas.

### `@orchestrator/enums`

- Usado pelos schemas do DB (`pgEnum`) e pelos workers.
- **Nunca hardcodar strings de enum.** Sempre importar do package `@orchestrator/enums`.

### `@orchestrator/constants`

- Portas, tópicos Kafka e defaults de env vars centralizados aqui.

## Regras de Desenvolvimento

### Código

- **Idioma:** Todo comentário, texto, nome de variável e função deve estar em **inglês**.
- **Não use `any`:** Nunca permita `any`. Sempre defina tipos explicitamente.
- **Constantes para comparações:** Nunca faça `if (x > y) { ... }`. Sempre crie uma constante descritiva:
  ```ts
  const isXBiggerThanY = x > y;
  if (isXBiggerThanY) { ... }
  ```
- **Early return:** Use sempre early return quando possível para evitar nesting desnecessário.
- **JSDocs:** Funções e constantes importantes para a regra de negócio sempre devem ter JSDocs simples porém explicativos.

### Kafka

- Nunca use `JSON.parse` solto. Sempre valide mensagens Kafka via `parseKafkaMessage` do `@orchestrator/schemas`.
- Todo payload Kafka é validado via `parseKafkaMessage` usando o schema correspondente.

### TypeScript

- Services são aplicações finais. tsconfig deve ter `"declaration": false, "declarationMap": false` para evitar `TS2742`.
