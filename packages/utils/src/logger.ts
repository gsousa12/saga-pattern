// oxlint-disable no-console
type LogLevel = 'info' | 'success' | 'warn' | 'error';

/**
 * Função de log estilizada para o terminal (Node.js)
 *
 * @param message A mensagem principal do log
 * @param data Dados adicionais (objetos, arrays, etc.)
 * @param level O nível do log que define a cor e o ícone
 */
export const logger = (message: string, data?: unknown, level: LogLevel = 'info'): void => {
  // Códigos ANSI para cores no terminal
  const colors = {
    info: '\x1b[36m', // Ciano
    success: '\x1b[32m', // Verde
    warn: '\x1b[33m', // Amarelo
    error: '\x1b[31m', // Vermelho
    reset: '\x1b[0m', // Reseta a cor
    dim: '\x1b[90m', // Cinza escuro
  };

  // Ícones e textos de prefixo para cada nível
  const prefixes = { info: 'ℹ INFO', success: '✔ SUCCESS', warn: '⚠ WARN', error: '✖ ERROR' };

  const color = colors[level];
  const prefix = prefixes[level];

  // Gera um timestamp para facilitar o rastreamento
  const timestamp = new Date().toLocaleTimeString('pt-BR');

  // 1. Imprime a mensagem principal colorida
  console.log(
    `${colors.dim}[${timestamp}]${colors.reset} ${color}[${prefix}] ${message}${colors.reset}`,
  );

  // 2. Se houver dados, imprime-os formatados
  if (data !== undefined) {
    console.log(`${colors.dim}↳ Detalhes:${colors.reset}`);

    // O console.dir com { colors: true } faz o "pretty print" de objetos e arrays nativamente no Node.js
    console.dir(data, {
      depth: null, // Expande todos os níveis do objeto
      colors: true, // Colore chaves, strings e números
    });

    // Quebra de linha extra para separar os logs visualmente
    console.log('');
  }
};
