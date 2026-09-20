/**
 * Postgres local para desenvolvimento, sem Docker e sem instalação no sistema.
 *
 * Em produção (Railway) o banco é o plugin PostgreSQL gerenciado — este script
 * existe só para que `npm run dev` funcione em qualquer máquina.
 *
 *   npm run dev:db      inicia (e mantém rodando) o Postgres em localhost:5433
 *   npm run dev:db stop  encerra
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import EmbeddedPostgres from 'embedded-postgres';

const DATA_DIR = path.join(process.cwd(), '.pgdata');
const PORT = 5433;
const DATABASE = 'araujo_learn';

async function main() {
  const fresh = !existsSync(path.join(DATA_DIR, 'PG_VERSION'));

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: 'postgres',
    password: 'postgres',
    port: PORT,
    persistent: true,
  });

  if (fresh) {
    console.log('[dev-db] inicializando cluster em .pgdata …');
    await pg.initialise();
  }

  await pg.start();
  console.log(`[dev-db] Postgres rodando em localhost:${PORT}`);

  try {
    await pg.createDatabase(DATABASE);
    console.log(`[dev-db] banco "${DATABASE}" criado`);
  } catch {
    console.log(`[dev-db] banco "${DATABASE}" já existe`);
  }

  console.log(
    `[dev-db] DATABASE_URL=postgresql://postgres:postgres@localhost:${PORT}/${DATABASE}?schema=public`,
  );

  const stop = async () => {
    console.log('\n[dev-db] encerrando …');
    await pg.stop().catch(() => {});
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // Mantém o processo vivo enquanto o Postgres serve o desenvolvimento.
  setInterval(() => {}, 1 << 30);
}

main().catch((error) => {
  console.error('[dev-db] falhou:', error);
  process.exit(1);
});
