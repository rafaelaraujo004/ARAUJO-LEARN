/**
 * Primeiro acesso em produção. Roda antes do servidor, depois das migrações.
 *
 * Se SEED_TUTOR_EMAIL estiver definido, executa o seed (idempotente): cria o
 * tutor e os cursos que ainda não existem, sem sobrescrever o que foi editado.
 * Sem a variável, não faz nada. Depois do primeiro deploy, remova
 * SEED_TUTOR_PASSWORD das variáveis do serviço.
 */
import { spawnSync } from 'node:child_process';

if (!process.env.SEED_TUTOR_EMAIL) {
  console.log('[bootstrap] SEED_TUTOR_EMAIL ausente; nada a fazer.');
  process.exit(0);
}
const result = spawnSync('npx', ['tsx', 'prisma/seed.ts'], { stdio: 'inherit', shell: true });
// Falha no seed não deve derrubar o site: o servidor sobe e o erro fica no log.
if (result.status !== 0) console.error('[bootstrap] o seed falhou; iniciando o servidor mesmo assim.');
