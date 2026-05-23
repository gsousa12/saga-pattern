# Guia de Estudo: Saga Pattern com Temporal.io

Este documento serve como base teórica e arquitetural para o seu projeto de estudo de um sistema de pagamento utilizando o padrão Saga e o Temporal.io.

---

## 1. O Básico do Temporal.io

O Temporal.io é uma plataforma de **execução durável** (durable execution). Ele permite que você escreva código que "não falha" de forma imprevisível. Se o seu servidor cair no meio de uma função, o Temporal garante que, ao reiniciar, a função retome exatamente da linha onde parou, com todas as variáveis de estado intactas.

Para entender o Temporal, você precisa conhecer quatro conceitos fundamentais:

* **Workflows:** É o cérebro da operação. É o código que define o fluxo de negócios (ex: o processo de pagamento). O código de um workflow deve ser estritamente **determinístico** — ele não pode acessar o banco de dados diretamente, fazer chamadas HTTP ou usar *timers* aleatórios.
* **Activities:** São os "músculos". É aqui que você coloca tudo que é não-determinístico e que tem efeitos colaterais: chamadas a APIs de gateways de pagamento (Stripe, Pagar.me), inserções no SQL Server, envio de e-mails, etc. Se uma *Activity* falhar, o Temporal a tenta novamente (retry) automaticamente com base nas políticas que você definir.
* **Workers:** São os processos da sua aplicação que hospedam a execução dos Workflows e Activities. Eles escutam o servidor do Temporal, pegam tarefas e as executam.
* **Temporal Cluster (Servidor):** É o banco de dados e a fila do Temporal. Ele não roda o seu código; ele apenas orquestra o estado. Ele anota: "O workflow X iniciou a atividade Y". Quando o worker termina a atividade, ele avisa o cluster, que atualiza o estado e envia o próximo passo.

---

## 2. O Saga Pattern no Sistema de Pagamento

O padrão Saga resolve o problema de transações distribuídas. Em uma arquitetura de microsserviços, você não tem um banco de dados único com `BEGIN TRANSACTION` e `COMMIT` para garantir ACID em todos os serviços.

### O Cenário de Pagamento

Imagine um fluxo de e-commerce simples:

1. **Reserva de Estoque** (Serviço de Inventário)
2. **Cobrança no Cartão** (Serviço de Pagamento)
3. **Atualização do Pedido** (Serviço de Pedidos)

### Como o Saga funciona aqui

O Saga propõe que, se o passo 2 (Cobrança) falhar por falta de limite no cartão, você precisa executar uma **transação de compensação** para desfazer o passo 1 (Devolver o estoque reservado).

### Como o Temporal soluciona isso

Normalmente, implementar um Saga exige a configuração de filas complexas (RabbitMQ/Kafka) e o gerenciamento manual de eventos (Coreografia), o que torna o debug um pesadelo.

O Temporal adota a **Orquestração**. O seu Workflow do Temporal atua como o "Gerente" do Saga. Ele roda as atividades sequencialmente (ou em paralelo). Como o Temporal mantém o estado de tudo, implementar as compensações vira um simples bloco `try/catch` no seu código TypeScript.

```typescript
// Exemplo conceitual (pseudo-código do Workflow)
export async function paymentSagaWorkflow(orderId: string) {
  try {
    await reserveInventoryActivity(orderId);

    try {
      await chargeCreditCardActivity(orderId);
    } catch (paymentError) {
      // Se o pagamento falhar, roda a compensação do estoque
      await releaseInventoryActivity(orderId);
      throw new Error("Saga abortada: Pagamento falhou");
    }

    await confirmOrderActivity(orderId);

  } catch (err) {
    // Lida com falhas globais do Saga
    await updateOrderStatusToFailedActivity(orderId);
  }
}

```

*O Temporal garante que esse código sobreviva a quedas de servidor e aplique retries exponenciais em cada atividade antes de considerar uma falha real.*

---

## 3. Rodando o Temporal Localmente (Gratuito)

**Sim, você pode rodar o Temporal localmente de forma 100% gratuita.** O Temporal é open-source. Eles ganham dinheiro com o *Temporal Cloud* (o cluster gerenciado por eles), mas para desenvolvimento e até produção autogerenciada, não há custo de licenciamento.

Existem duas formas fáceis de rodar o cluster localmente no seu ambiente Linux Mint:

1. **Temporal CLI (Recomendado para estudo local):**
Eles possuem uma CLI que sobe um servidor em memória (usando SQLite) com um único comando. Inclui a Web UI (interface visual incrível para ver o histórico dos seus workflows).
*Comando:* `temporal server start-dev`
2. **Docker Compose:**
Para um ambiente mais próximo do real (utilizando PostgreSQL/MySQL e Elasticsearch), eles fornecem um arquivo `docker-compose.yml` pronto no repositório oficial. Ideal se você for preparar o projeto para deploy em produção mais tarde.

---

---

---

A integração em uma arquitetura com Temporal segue uma regra de ouro: **separação estrita de responsabilidades**.

* **O Banco de Dados (Drizzle):** Só pode ser acessado dentro das **Activities**. Como os Workflows precisam ser determinísticos (rodar exatamente da mesma forma se o servidor reiniciar), qualquer operação de I/O (banco de dados, chamadas a APIs externas, leitura de arquivos) é proibida dentro do Workflow e delegada para as Activities.
* **As Rotas da API (Fastify):** Funcionam apenas como "gatilhos". A rota recebe a requisição HTTP do usuário e usa o Temporal Client para avisar o cluster: *"Inicie esse Workflow"*. A rota geralmente responde rápido (ex: `202 Accepted`) devolvendo o ID do workflow, sem ficar esperando todo o processo de pagamento terminar.

Aqui está um exemplo prático e simplificado dividindo essas partes.

### 1. O Banco de Dados e as Activities

Primeiro, definimos nosso schema com Drizzle e criamos as funções que interagem com o banco e sistemas externos.

```typescript
// schema.ts
import { pgTable, serial, text, varchar } from 'drizzle-orm/pg-core';

export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  status: varchar('status', { length: 50 }).notNull(),
  item: text('item').notNull(),
});

```

```typescript
// activities.ts
import { db } from './db'; // Sua conexão configurada do Drizzle
import { orders } from './schema';
import { eq } from 'drizzle-orm';

// Activity 1: Cria o pedido no banco com status PENDENTE
export async function createOrder(item: string): Promise<number> {
  const [newOrder] = await db.insert(orders)
    .values({ item, status: 'PENDING' })
    .returning({ id: orders.id });

  return newOrder.id;
}

// Activity 2: Simula cobrança no gateway (Stripe/Pagar.me)
export async function chargePayment(orderId: number): Promise<void> {
  console.log(`Cobrando cartão para o pedido ${orderId}...`);
  // Se der erro aqui (ex: sem limite), o Temporal fará o retry automaticamente!
}

// Activity 3: Atualiza o banco para SUCESSO
export async function confirmOrder(orderId: number): Promise<void> {
  await db.update(orders)
    .set({ status: 'COMPLETED' })
    .where(eq(orders.id, orderId));
}

```

### 2. O Workflow (A Orquestração)

Aqui fica a regra de negócio do Saga. Note que o Workflow não importa o Drizzle; ele apenas chama as Activities.

```typescript
// workflows.ts
import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';

// Configura como as activities serão chamadas (ex: tempo limite, retries)
const { createOrder, chargePayment, confirmOrder } = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

export async function paymentSaga(item: string): Promise<string> {
  // 1. Cria o pedido no banco
  const orderId = await createOrder(item);

  try {
    // 2. Tenta cobrar. O Temporal vai tentar novamente se falhar (de acordo com as políticas)
    await chargePayment(orderId);
  } catch (error) {
    // Aqui entraria a Activity de compensação (ex: cancelar o pedido no banco) se a falha for definitiva
    throw new Error(`Falha no pagamento do pedido ${orderId}`);
  }

  // 3. Atualiza o banco
  await confirmOrder(orderId);

  return `Pedido ${orderId} finalizado com sucesso!`;
}

```

### 3. A Rota da API (Fastify)

A sua API Fastify usa o Temporal Client para iniciar o fluxo e liberar o usuário rapidamente.

```typescript
// server.ts
import Fastify from 'fastify';
import { Connection, Client } from '@temporalio/client';
import { paymentSaga } from './workflows';

const fastify = Fastify();

fastify.post('/checkout', async (request, reply) => {
  const { item } = request.body as { item: string };

  // Conecta ao servidor local do Temporal
  const connection = await Connection.connect();
  const client = new Client({ connection });

  // Inicia o Workflow em background
  const handle = await client.workflow.start(paymentSaga, {
    args: [item],
    taskQueue: 'payment-queue',
    // Um ID único previne que o mesmo pagamento seja iniciado duas vezes (Idempotência)
    workflowId: `payment-${Date.now()}`,
  });

  // Responde imediatamente enquanto o Temporal trabalha nos bastidores
  return reply.status(202).send({
    message: 'Processamento de pagamento iniciado',
    workflowId: handle.workflowId,
  });
});

fastify.listen({ port: 3000 }, () => {
  console.log('API Fastify rodando na porta 3000');
});

```

> **A peça que falta:** Para que o código do Workflow e das Activities realmente execute, você precisa rodar um processo separado chamado **Worker**. O Fastify apenas enfileira o trabalho; o Worker é quem escuta a fila `payment-queue` e executa o TS.

---

---

---

O Worker é o verdadeiro motor da sua aplicação Temporal. Enquanto o Fastify apenas avisa o servidor que um processo deve começar, é o Worker que fica ativamente escutando a fila (`payment-queue`) e executando as suas regras de negócio e inserções no banco de dados.

O Temporal roda os Workflows em um ambiente isolado (V8 Isolates) para garantir o determinismo. Por isso, ao invés de importar a função do workflow diretamente, nós passamos o caminho do arquivo para que o Temporal faça o empacotamento (bundling) correto.

## 1. Criando o arquivo do Worker

Crie um arquivo chamado `worker.ts`. Ele será um processo Node.js independente da sua API.

```typescript
// worker.ts
import { Worker } from '@temporalio/worker';
import * as activities from './activities'; // Importa suas funções do Drizzle

async function run() {
  // O Worker se conecta por padrão ao Temporal Server local (localhost:7233)
  const worker = await Worker.create({
    // O Temporal precisa do caminho absoluto para o arquivo de workflows
    workflowsPath: require.resolve('./workflows'),

    // Passamos as activities que o workflow poderá chamar
    activities,

    // Deve ser exatamente a mesma fila definida na sua rota Fastify
    taskQueue: 'payment-queue',
  });

  console.log('Worker rodando e escutando a payment-queue...');

  // O método run() inicia o worker e mantém o processo vivo
  await worker.run();
}

run().catch((err) => {
  console.error('Erro fatal no Worker:', err);
  process.exit(1);
});

```

## 2. Como rodar o ambiente completo

Para que tudo funcione, você precisará de três terminais separados rodando simultaneamente.

**Terminal 1: O Servidor Temporal**
Inicie o cluster local do Temporal.

```bash
temporal server start-dev

```

*Dica: Ao rodar este comando, o Temporal também sobe uma interface Web no endereço `http://localhost:8233`. Lá você consegue ver todos os workflows iniciados, falhas e o histórico de cada passo.*

**Terminal 2: O Worker**
O processo que vai executar o código de fato. Como você está usando TypeScript, pode rodar diretamente com `bun` ou `tsx`.

```bash
bun run worker.ts
# ou usando tsx: npx tsx worker.ts

```

**Terminal 3: A sua API (Fastify/Hono)**
O servidor web que vai receber as requisições HTTP e iniciar os workflows.

```bash
bun run server.ts
# ou usando tsx: npx tsx server.ts

```

### O fluxo em ação:

1. Você faz um POST para a sua API (ex: `http://localhost:3000/checkout`).
2. A API conecta no Temporal (Terminal 1) e enfileira a tarefa na `payment-queue`.
3. A API responde imediatamente para o cliente (Status 202).
4. O Worker (Terminal 2) pega a tarefa da fila, roda o código determinístico do `workflows.ts` e executa as `activities.ts`, inserindo os dados no seu banco através do Drizzle.
