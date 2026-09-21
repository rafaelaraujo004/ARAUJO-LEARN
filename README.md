# ARAÚJO LEARN

> **Aprenda. Evolua. Conquiste.**

Plataforma própria de cursos online, construída em torno de um único tutor:
**Tutor → Conteúdo → Aluno → Aprendizado**.

Fluxo principal: curso → aula → vídeo → progresso → conclusão → certificado.

## O que já faz

**Aluno** — cria conta, pede matrícula, assiste às aulas com retomada exata de onde parou,
baixa materiais, faz atividades, acompanha o progresso e recebe certificado com código
verificável publicamente.

**Tutor** — cria cursos, módulos e aulas; envia vídeos e materiais direto para o bucket; monta
atividades; libera acessos (com data de validade opcional); acompanha alunos e progresso;
emite e revoga certificados; edita o próprio perfil e o preço/condições de cada curso.

**Regras de negócio embutidas** — curso bônus liberado sozinho quando o aluno tem os dois cursos
pagos; atividade obrigatória bloqueia a conclusão do curso; certificado é emitido uma única vez e
congela nome/curso/carga horária.

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript estrito |
| Estilo | Tailwind CSS v4 + design system próprio (`src/app/globals.css`) |
| Banco | PostgreSQL + Prisma 7 |
| Auth | Sessão opaca em cookie `httpOnly` (hash no banco) + senha com `scrypt` |
| Arquivos | S3-compatível atrás da interface `StorageProvider` (Railway Bucket hoje) |
| Upload | Direto do navegador para o bucket (URL assinada, multipart com retomada) |
| Certificado | `pdf-lib` |
| Testes | Vitest — unitários + integração contra Postgres real |
| Deploy | Railway (`railway.json`) · CI no GitHub Actions |

Decisões e motivos: [`DECISIONS.md`](DECISIONS.md).

## Rodar localmente

Requisitos: Node 20+.

```bash
npm install
cp .env.example .env          # ajuste o AUTH_SECRET
npm run dev:db                # Postgres local, sem Docker (deixe rodando)
npm run db:migrate            # cria as tabelas
npm run db:seed               # tutor + cursos + aluno de demonstração
npm run dev                   # http://localhost:3000
```

Sem credenciais de bucket, os arquivos vão para `.storage/` (só desenvolvimento). O e-mail de
recuperação de senha é impresso no terminal.

Acessos de demonstração (criados pelo seed):

| Papel | E-mail | Senha |
|---|---|---|
| Tutor/Admin | `amilton@araujolearn.com` | `araujo2024` |
| Aluno | `aluno@araujolearn.com` | `aluno2024` |

> Troque essas senhas (ou apague as contas) antes de publicar.

## Verificação

```bash
npm run verify        # auditoria de actions + lint + tipos + testes
```

Para incluir os testes de regras de negócio contra o banco:

```bash
TEST_DATABASE_URL="postgresql://postgres:postgres@localhost:5433/araujo_learn?schema=public" npm test
```

Cada teste de banco usa dados com sufixo único e limpa o que criou.

## Estrutura

```
src/
  app/                 rotas: (site) público · (auth) · (learn) aluno · admin · aula · api
  components/          ui/ · admin/ · course/ · lesson/ · player/ · activity/ · brand/
  server/              domínio (só servidor): access, progress, activities, certificates, storage/
  server/actions/      Server Actions (cada uma valida quem chama)
  lib/                 código puro e testável: grading, validation, utils, uploader
prisma/                schema, migrações e seed
tools/                 audit-actions · check-storage · build-brand-assets · local-install
tests/                 unitários e integração
docs/                  DEPLOY-RAILWAY.md
```

## Segurança (resumo)

- Autorização sempre no servidor; `tools/audit-actions.mjs` falha o CI se uma Server Action
  não verificar quem chama.
- Bucket privado; vídeo e material só por URL assinada de curta duração, após checar a matrícula.
- Correção de atividades no servidor; o gabarito só chega ao aluno depois do envio.
- Limite de tentativas em login, cadastro, recuperação de senha, envio de atividades e validação
  de certificado.
- CSP, HSTS, `X-Frame-Options`, `nosniff`; cookies `httpOnly`, `secure` e `sameSite=lax`.
- Markdown das aulas renderizado por elementos React (nunca HTML bruto).

## Marca

O "A" e as fotos do tutor ficam em `public/marca/` e `public/tutor/`. Para regenerar favicon e
ícones a partir do original: `node tools/build-brand-assets.mjs brand/a-original.png`.

## Deploy

[`docs/DEPLOY-RAILWAY.md`](docs/DEPLOY-RAILWAY.md).

## Pendências que dependem de você

[`BLOCKERS.md`](BLOCKERS.md).
