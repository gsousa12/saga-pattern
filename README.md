# Orchestrator Saga

Implementacão do **Saga Pattern (Orchestrator)** sem uso de frameworks externos.

Este e um **projeto de estudo** que simula um fluxo de pedido distribuido entre multiplos microservicos, coordenado por um orchestrator central.

## O que e Saga Pattern?

Saga e um padrao de design para gerenciar transacões distribuidas. Em vez de uma unica transacao ACID, o fluxo e dividido em passos independentes. Se algum passo falha, sao executadas acões de compensacão para desfazer o que já foi feito.

## Stack

- **Node.js + TypeScript**
- **Fastify** (HTTP APIs)
- **Drizzle ORM** (PostgreSQL)
- **Kafka** (mensageria entre services)
- **pnpm workspaces** (monorepo)

## Services

| Service              | Porta | Responsabilidade         |
| -------------------- | ----- | ------------------------ |
| orchestrator         | 3000  | Coordena o fluxo do saga |
| order-service        | 3001  | Cria e gerencia pedidos  |
| payment-service      | 3002  | Processa pagamentos      |
| stock-service        | 3003  | Controle de estoque      |
| notification-service | 3004  | Envia notificacoes       |
