import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Configuração do Prisma CLI (migrations, seed).
 *
 * `prisma generate` roda no `postinstall`, durante o build — quando o Railway
 * ainda não injetou DATABASE_URL — e não precisa de banco. Por isso a URL tem um
 * valor de reserva SÓ para essa etapa. Comandos que conectam de verdade
 * (`migrate deploy`, seed) rodam com a variável real e falham alto se ela faltar.
 */
const url = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { seed: 'tsx prisma/seed.ts' },
  datasource: {
    url: url ?? 'postgresql://build:build@localhost:5432/build',
  },
});
