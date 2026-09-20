import 'server-only';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '@/lib/env';

/**
 * Uma única instância do Prisma por processo.
 *
 * Em desenvolvimento o Next recarrega módulos a cada alteração; sem o cache
 * global abriríamos um pool novo a cada hot reload até esgotar as conexões.
 *
 * A conexão entra por driver adapter (Prisma 7), o que também deixa o caminho
 * aberto para pooling externo ou outro driver sem mexer no schema.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: env.databaseUrl });
  return new PrismaClient({
    adapter,
    log: env.isProduction ? ['error'] : ['warn', 'error'],
  });
}

export const db = globalForPrisma.prisma ?? createClient();

if (!env.isProduction) globalForPrisma.prisma = db;
