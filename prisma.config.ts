import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Configuração do Prisma CLI (migrations, seed).
 * A partir do Prisma 7 a URL do banco sai do schema e vem para cá; o cliente
 * em runtime recebe a conexão pelo adapter (ver `src/server/db.ts`).
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
});
