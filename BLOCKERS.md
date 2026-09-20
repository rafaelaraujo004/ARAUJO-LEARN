# Bloqueios que exigem ação do Rafael

Nada aqui interrompe o restante do projeto — as partes bloqueadas são puladas e o
desenvolvimento continua em todas as outras frentes.

---

## 1. Provisionamento no Railway (credenciais)
**O que falta:** criar o projeto no Railway e preencher as variáveis de ambiente reais.

Quando voltar, faça:
1. `railway login` → `railway init` (projeto **araujo-learn**)
2. Adicione o plugin **PostgreSQL** → copie `DATABASE_URL`
3. Crie um **Storage Bucket** (S3-compatible) → copie endpoint, bucket, access key e secret
4. Preencha no painel do Railway (ou `.env` local) as variáveis listadas em `.env.example`
5. `npm run db:deploy && npm run db:seed`

Sem isso, o app roda localmente contra o Postgres embutido de desenvolvimento, e os
uploads usam o driver de storage local (`STORAGE_DRIVER=local`). Nenhuma outra parte
do projeto depende dessas credenciais.

## 2. Conteúdo real (identidade do tutor)
**O que falta:** foto do tutor, biografia definitiva, textos de marca e cursos reais.
Hoje há conteúdo de demonstração no seed (`prisma/seed.ts`), claramente marcado, e a
foto do tutor usa um avatar gerado. Substituível pelo painel, sem tocar em código.

## 3. E-mail transacional (recuperação de senha)
**O que falta:** credenciais SMTP ou chave de um provedor (Resend/Postmark).
Hoje: o fluxo de recuperação está **completo e funcional**; sem credenciais, o link de
redefinição é registrado no log do servidor em vez de enviado por e-mail
(`src/server/mail.ts`, driver `console`). Basta preencher `SMTP_*` ou `RESEND_API_KEY`.
