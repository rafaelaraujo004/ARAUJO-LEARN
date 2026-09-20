#!/usr/bin/env node
/**
 * Instalador resiliente para redes que corrompem downloads grandes via TLS.
 *
 * Nesta máquina, tanto o npm quanto o curl falham com
 * `SEC_E_DECRYPT_FAILURE` / `ERR_SSL_CIPHER_OPERATION_FAILED` no meio de tarballs
 * grandes. O download com *retomada* (`curl -C -`) funciona, então:
 *
 *   1. resolve a árvore de dependências (só metadados, requisições pequenas);
 *   2. baixa cada tarball com retomada + verificação de integridade;
 *   3. aponta o package-lock para os arquivos locais e roda `npm ci --offline`;
 *   4. restaura o package-lock original (com URLs do registry) para CI/Railway.
 *
 * Em ambientes de rede saudáveis (CI, Railway) nada disso é necessário:
 * `npm ci` comum funciona. Este script é só um contorno local.
 *
 * Uso: node tools/local-install.mjs [specs...]
 */
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const LOCK = path.join(ROOT, 'package-lock.json');
const BACKUP = path.join(ROOT, '.package-lock.registry.json');
const VENDOR = process.env.NPM_VENDOR_DIR || 'C:/Users/Public/npm-vendor';
const MAX_TRIES = 40;

const log = (...a) => console.log('[local-install]', ...a);

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  return r.status ?? 1;
}

function integrityOf(file, algo) {
  const h = createHash(algo);
  h.update(fs.readFileSync(file));
  return `${algo}-${h.digest('base64')}`;
}

/** Baixa com retomada até o arquivo bater com a integridade esperada. */
function fetchTarball(url, dest, integrity) {
  const [algo] = (integrity || 'sha512-').split('-');
  if (fs.existsSync(dest)) {
    if (!integrity || integrityOf(dest, algo) === integrity) return true;
    fs.rmSync(dest);
  }
  for (let i = 1; i <= MAX_TRIES; i++) {
    const r = spawnSync('curl', ['-sS', '-L', '-C', '-', '--retry', '3', '-o', dest, url], {
      stdio: ['ignore', 'ignore', 'pipe'],
      shell: false,
    });
    if (r.status === 0 && fs.existsSync(dest)) {
      if (!integrity || integrityOf(dest, algo) === integrity) return true;
      // conteúdo inválido: recomeça do zero
      fs.rmSync(dest);
    }
  }
  return false;
}

function collect(lock) {
  const out = [];
  for (const [key, pkg] of Object.entries(lock.packages || {})) {
    if (!pkg.resolved || !pkg.resolved.startsWith('http')) continue;
    out.push({ key, pkg });
  }
  return out;
}

const specs = process.argv.slice(2);

// 1. Resolver a árvore (apenas metadados)
log('resolvendo árvore de dependências…');
if (fs.existsSync(BACKUP)) fs.copyFileSync(BACKUP, LOCK);
const resolveArgs = ['install', '--package-lock-only', '--no-audit', '--no-fund', ...specs];
if (run('npm', resolveArgs) !== 0) {
  console.error('[local-install] falha ao resolver dependências');
  process.exit(1);
}
fs.copyFileSync(LOCK, BACKUP);

// 2. Baixar tarballs
fs.mkdirSync(VENDOR, { recursive: true });
const lock = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
const entries = collect(lock);
log(`${entries.length} pacotes a garantir em cache local…`);

let done = 0;
let failed = 0;
for (const { key, pkg } of entries) {
  const name = pkg.resolved.split('/-/').pop() || path.basename(pkg.resolved);
  const scope = key.replace(/^node_modules\//, '').split('/node_modules/').pop().replace(/[\/]/g, '+');
  const dest = path.join(VENDOR, `${scope}-${name}`);
  if (!fetchTarball(pkg.resolved, dest, pkg.integrity)) {
    console.error(`[local-install] FALHOU: ${pkg.resolved}`);
    failed++;
    continue;
  }
  pkg.resolved = pathToFileURL(dest).href;
  done++;
  if (done % 50 === 0) log(`${done}/${entries.length}`);
}
log(`tarballs prontos: ${done}, falhas: ${failed}`);
if (failed) process.exit(1);

// 3. Instalar offline a partir dos arquivos locais
fs.writeFileSync(LOCK, JSON.stringify(lock, null, 2));
const code = run('npm', ['ci', '--offline', '--no-audit', '--no-fund']);

// 4. Restaurar o lockfile publicável
fs.copyFileSync(BACKUP, LOCK);
log(code === 0 ? 'instalação concluída' : 'npm ci falhou');
process.exit(code);
