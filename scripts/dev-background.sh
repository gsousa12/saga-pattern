#!/usr/bin/env bash
set -euo pipefail

# Roda todos os servicos em background e salva logs em arquivos
# Use: tail -f logs/gateway.log

LOG_DIR="logs"
mkdir -p "$LOG_DIR"

# Limpa logs antigos
rm -f "$LOG_DIR"/*.log

echo "=== Subindo infra (docker compose) ==="
docker compose up -d

echo "=== Aguardando Kafka e Postgres ==="
sleep 5

echo "=== Rodando migrations ==="
pnpm db:migrate

echo "=== Compilando workspaces ==="
pnpm build

echo "=== Iniciando servicos em background ==="

pnpm run dev:gateway > "$LOG_DIR/gateway.log" 2>&1 &
echo "gateway PID: $!"

pnpm run dev:orchestrator > "$LOG_DIR/orchestrator.log" 2>&1 &
echo "orchestrator PID: $!"

pnpm run dev:order > "$LOG_DIR/order-service.log" 2>&1 &
echo "order-service PID: $!"

pnpm run dev:stock > "$LOG_DIR/stock-service.log" 2>&1 &
echo "stock-service PID: $!"

pnpm run dev:payment > "$LOG_DIR/payment-service.log" 2>&1 &
echo "payment-service PID: $!"

pnpm run dev:notification > "$LOG_DIR/notification-service.log" 2>&1 &
echo "notification-service PID: $!"

echo ""
echo "Servicos rodando em background. Logs em $LOG_DIR/"
echo ""
echo "Comandos uteis:"
echo "  tail -f $LOG_DIR/gateway.log"
echo "  tail -f $LOG_DIR/order-service.log"
echo "  tail -f $LOG_DIR/orchestrator.log"
echo ""
echo "Para matar todos: pkill -f 'pnpm run dev:'"
echo "Para parar infra: docker compose down"
