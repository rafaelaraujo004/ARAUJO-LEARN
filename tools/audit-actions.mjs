#!/usr/bin/env node
/**
 * Auditoria de Server Actions.
 *
 * Todo `export async function` de um arquivo 'use server' vira um endpoint HTTP
 * público. Este script lista cada um e falha se algum não chamar uma verificação
 * de identidade/permissão — ou não estiver na lista explícita de ações públicas.
 *
 *   node tools/audit-actions.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const DIR = path.join(process.cwd(), 'src/server/actions');

/** Ações que PRECISAM ser públicas (login, cadastro, recuperação). */
const PUBLIC = new Set(['registerAction', 'loginAction', 'forgotAction', 'resetAction']);

const GUARDS = [
  'requireStaff',
  'requireAdmin',
  'requireUser',
  'getCurrentUser',
  'destroyCurrentSession', // logout: só apaga a própria sessão
];

let failures = 0;

for (const file of fs.readdirSync(DIR).filter((name) => name.endsWith('.ts'))) {
  const source = fs.readFileSync(path.join(DIR, file), 'utf8');
  if (!source.includes("'use server'")) continue;

  const pattern = /export async function (\w+)\s*\(/g;
  const matches = [...source.matchAll(pattern)];

  matches.forEach((match, index) => {
    const name = match[1];
    const start = match.index ?? 0;
    const end = matches[index + 1]?.index ?? source.length;
    const body = source.slice(start, end);

    const guarded = GUARDS.some((guard) => body.includes(`${guard}(`));
    const isPublic = PUBLIC.has(name);

    if (guarded || isPublic) {
      console.log(`  ok   ${file.padEnd(16)} ${name}${isPublic ? '  (pública, limitada por taxa)' : ''}`);
    } else {
      console.error(`  FALHA ${file.padEnd(15)} ${name} — sem verificação de permissão`);
      failures += 1;
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} ação(ões) sem proteção.`);
  process.exit(1);
}
console.log('\nTodas as Server Actions verificam quem está chamando.');
