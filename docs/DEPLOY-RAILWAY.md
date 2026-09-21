# Deploy no Railway — passo a passo

Tempo estimado: 20 a 30 minutos. Não exige conhecimento técnico além de copiar e colar.

A plataforma roda em **um único serviço** (a aplicação) mais dois recursos do Railway:
**PostgreSQL** (dados) e **Storage Bucket** (vídeos, PDFs e imagens).

```
Navegador ──► Aplicação (Railway) ──► PostgreSQL (Railway)
     │
     └──────► Storage Bucket (Railway)   ← vídeos vão DIRETO do navegador para cá,
                                            sem passar pela aplicação
```

---

## 1. Criar o projeto e subir o código

1. Suba este repositório para o GitHub (privado).
2. No Railway: **New Project → Deploy from GitHub repo** → escolha o repositório.
3. O Railway lê o `railway.json` e o `nixpacks.toml` sozinho. Não precisa configurar build.

## 2. Adicionar o banco

No projeto: **+ New → Database → PostgreSQL**.

Na aplicação, em **Variables**, crie:

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência ao plugin) |

As migrações rodam sozinhas a cada deploy (`prisma migrate deploy` no comando de início).

## 3. Adicionar o bucket de arquivos

No projeto: **+ New → Bucket**. Depois, na aplicação, referencie as variáveis do bucket.
A plataforma aceita os nomes que o Railway injeta (`AWS_*`) **e** os nomes `S3_*`:

| Variável | Valor |
|---|---|
| `AWS_ENDPOINT_URL` | `${{Bucket.AWS_ENDPOINT_URL}}` |
| `AWS_S3_BUCKET_NAME` | `${{Bucket.AWS_S3_BUCKET_NAME}}` |
| `AWS_ACCESS_KEY_ID` | `${{Bucket.AWS_ACCESS_KEY_ID}}` |
| `AWS_SECRET_ACCESS_KEY` | `${{Bucket.AWS_SECRET_ACCESS_KEY}}` |

> Se os nomes das variáveis do seu bucket forem diferentes, use as de `.env.example`
> (`S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`).

O bucket é **privado**. Nenhum vídeo tem endereço público: o aluno recebe um link temporário
(15 minutos) somente depois de o servidor conferir a matrícula.

## 4. Variáveis obrigatórias da aplicação

| Variável | Valor |
|---|---|
| `AUTH_SECRET` | Gere: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `APP_URL` | O endereço público, ex.: `https://araujolearn.up.railway.app` (ou seu domínio) |
| `NODE_ENV` | `production` |

Sem `AUTH_SECRET` a aplicação **não sobe** em produção — de propósito.

## 5. Liberar o upload direto (CORS) — **passo essencial**

Os vídeos são enviados do navegador direto para o bucket. Para isso o bucket precisa permitir
o endereço do site. Com as variáveis no seu `.env` local (ou exportadas), rode **uma vez**:

```bash
node --env-file=.env tools/check-storage.mjs --apply-cors
```

Ele testa, na ordem: gravar/ler objeto, URL assinada, upload direto, upload em partes (vídeos
grandes) e aplica o CORS. Se algum passo falhar, a mensagem diz exatamente qual.

Depois, para conferir a qualquer momento:

```bash
node --env-file=.env tools/check-storage.mjs
```

> **Se o passo 5 falhar por o Railway não aceitar CORS via API:** configure a regra pelo painel
> do bucket — origem = `APP_URL`, métodos `GET, PUT, HEAD`, cabeçalho exposto `ETag`. O
> `ETag` exposto é indispensável: sem ele o envio de vídeos grandes não fecha.

## 6. Criar o tutor (primeiro acesso)

No terminal do Railway (ou localmente apontando para o banco de produção):

```bash
SEED_TUTOR_EMAIL=seu@email.com SEED_TUTOR_PASSWORD='uma-senha-forte-123' npm run db:seed
```

Isso cria o tutor/administrador, os três cursos com módulos e aulas, e um aluno de
demonstração. **Troque a senha do aluno de demonstração ou apague a conta** (Painel → Alunos).

## 7. Domínio próprio (opcional)

No serviço: **Settings → Networking → Custom Domain**. Depois atualize `APP_URL` e rode o
passo 5 de novo (o CORS precisa do endereço novo).

## 8. E-mail de recuperação de senha (opcional, mas recomendado)

Sem SMTP, o link de recuperação aparece apenas no log do servidor — o tutor ainda consegue
gerar o link manualmente em **Painel → Alunos → aluno → Gerar link de redefinição** e enviar
pelo WhatsApp. Para envio automático, preencha:

| Variável | Exemplo |
|---|---|
| `MAIL_DRIVER` | `smtp` |
| `SMTP_HOST` / `SMTP_PORT` | `smtp.resend.com` / `465` |
| `SMTP_USER` / `SMTP_PASSWORD` | conforme o provedor |
| `MAIL_FROM` | `ARAÚJO LEARN <nao-responda@seudominio.com>` |

---

## Ambientes (desenvolvimento, teste e produção)

Use **Environments** do Railway: crie `staging` a partir de `production`. Cada ambiente tem o
próprio banco, o próprio bucket e as próprias variáveis — nada é compartilhado.

## Custos

Com ~5 GB de arquivos e poucos alunos simultâneos, o consumo é baixo: a aplicação é leve e o
maior custo é o armazenamento e a saída de dados dos vídeos. Acompanhe em **Usage**.

Se o número de alunos e de visualizações crescer, migrar os vídeos para um serviço de streaming
(Cloudflare Stream, Mux) é uma troca **isolada** em `src/server/storage/` e na rota
`src/app/api/lessons/[id]/video/route.ts` — o resto da plataforma não muda.

## Se algo der errado

| Sintoma | Causa provável |
|---|---|
| Deploy cai no início | `AUTH_SECRET` ou `DATABASE_URL` ausentes (veja os logs) |
| Upload de vídeo trava em 0% | CORS do bucket (passo 5) |
| Upload chega a 100% e dá erro ao finalizar | Cabeçalho `ETag` não exposto no CORS |
| Vídeo não carrega para o aluno | Matrícula expirada/revogada — ou URL assinada vencida (recarregue a aula) |
| Vídeos somem depois de um deploy | A aplicação está em **disco local**: confira as variáveis do bucket. O log de boot avisa isso. |
