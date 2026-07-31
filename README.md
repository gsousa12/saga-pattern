# Orchestrator Saga

Implementation of the **Saga Pattern (Orchestrator)** without using external frameworks.

This is a **study project** that simulates a distributed order flow across multiple microservices, coordinated by a central orchestrator.

## What is the Saga Pattern?

Saga is a design pattern for managing distributed transactions. Instead of a single ACID transaction, the flow is divided into independent steps. If any step fails, compensation actions are executed to undo what has already been done.

## Stack

- **Node.js + TypeScript**
- **Fastify** (HTTP APIs)
- **Drizzle ORM** (PostgreSQL)
- **Kafka** (messaging between services)
- **pnpm workspaces** (monorepo)

## Services

| Service              | Port | Responsibility             |
| -------------------- | ---- | -------------------------- |
| orchestrator         | 3000 | Coordinates the saga flow  |
| order-service        | 3001 | Creates and manages orders |
| payment-service      | 3002 | Processes payments         |
| stock-service        | 3003 | Inventory control          |
| notification-service | 3004 | Sends notifications        |
