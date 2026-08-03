#!/usr/bin/env bash
set -euo pipefail

# Verifica se estamos no root do monorepo
if [ ! -f "pnpm-workspace.yaml" ]; then
  echo "Erro: rode este script da raiz do monorepo (onde esta o pnpm-workspace.yaml)"
  exit 1
fi

# Verifica dependencias
echo "=== Subindo infra (docker compose) ==="
docker compose up -d

echo "=== Aguardando Kafka e Postgres ficarem prontos ==="
sleep 5

echo "=== Rodando migrations ==="
pnpm db:migrate

echo "=== Compilando workspaces ==="
pnpm build

# Abre um terminal para cada servico
echo "=== Abrindo terminais para cada servico ==="

SERVICES=(
  "gateway:pnpm run dev:gateway"
  "orchestrator:pnpm run dev:orchestrator"
  "order-service:pnpm run dev:order"
  "stock-service:pnpm run dev:stock"
  "payment-service:pnpm run dev:payment"
  "notification-service:pnpm run dev:notification"
)

for item in "${SERVICES[@]}"; do
  name="${item%%:*}"
  cmd="${item#*:}"
  gnome-terminal --title="dev: $name" -- bash -c "echo \"=== $name ===\"; $cmd; exec bash"
  sleep 0.3
done

echo ""
echo "Todos os servicos estao rodando em terminais separados."
echo "Para parar a infra: docker compose down"
