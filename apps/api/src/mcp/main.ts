import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { AccountsService } from '../accounts/accounts.service';
import { BenchmarksService } from '../market/benchmarks.service';
import { PluggyConnectionsService } from '../open-finance/pluggy-connections.service';
import { registerTools } from './tools';

/**
 * Read-only MCP server over Kevin's ledger, spoken on stdio.
 *
 * It boots the Nest application context rather than the HTTP app, so every tool reuses the
 * same services the web API does — one implementation of the balance and P/L rules, not two.
 *
 * Nothing may write to stdout except JSON-RPC frames: a stray log line corrupts the stream
 * and the client drops the connection. Hence `logger: false` and stderr for diagnostics.
 */
/**
 * Loads `apps/api/.env` from a path anchored to this file.
 *
 * An MCP client spawns the server from wherever the conversation happens, so relying on the
 * working directory to find the environment would break every call outside the API folder.
 * Existing variables win, so a client can still override.
 */
function loadEnv(): void {
  // dist/src/mcp/main.js -> apps/api/.env
  const envPath = resolve(__dirname, '../../../.env');

  let contents: string;
  try {
    contents = readFileSync(envPath, 'utf8');
  } catch {
    return; // Nothing to load; the environment may already be populated.
  }

  for (const line of contents.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    process.env[key] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
  }
}

async function bootstrap(): Promise<void> {
  loadEnv();

  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
  app.enableShutdownHooks();

  const server = new McpServer({ name: 'kevin', version: '0.1.0' });

  registerTools(server, {
    prisma: app.get(PrismaService),
    dashboard: app.get(DashboardService),
    accounts: app.get(AccountsService),
    benchmarks: app.get(BenchmarksService),
    connections: app.get(PluggyConnectionsService),
  });

  await server.connect(new StdioServerTransport());
  console.error('kevin MCP server ready on stdio');

  const shutdown = async () => {
    await server.close().catch(() => undefined);
    await app.close().catch(() => undefined);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch((error) => {
  console.error('kevin MCP server failed to start:', error);
  process.exit(1);
});
