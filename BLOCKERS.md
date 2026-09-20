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

## 2. Conteúdo das aulas (vídeos, apostila e foto do tutor)
**O que falta:** os vídeos das aulas, a apostila/material complementar e a foto do
Eng. Amilton Araújo.

O que já está pronto: tutor, os três cursos reais (com preços, carga horária e o que
acompanha cada um), a estrutura completa de módulos e aulas, e o texto de algumas
aulas. Tudo isso foi montado como **base de partida** — títulos, ementas e textos são
editáveis pelo painel, sem tocar em código.

Quando voltar: entre em **Painel → Cursos → Conteúdo**, abra cada aula, envie o vídeo e
anexe os materiais. Em **Painel → Perfil do tutor**, envie sua foto.

## 2b. Pagamento (gateway)
**O que falta:** decidir se quer cobrança automática (Mercado Pago, Asaas, Stripe…).

Hoje o fluxo está completo e funcional **sem gateway**: o aluno vê o preço, escolhe PIX
ou cartão, registra o pedido e fala com você pelo WhatsApp; você confirma o pagamento e
libera o acesso em **Painel → Solicitações**. O curso bônus entra sozinho quando os dois
cursos estão liberados.

Se um dia quiser automatizar, o ponto de integração é único: chamar
`approveRequestAction` quando o gateway confirmar o pagamento
(`src/server/actions/requests.ts`). Nada mais muda.

## 3. E-mail transacional (recuperação de senha)
**O que falta:** credenciais SMTP ou chave de um provedor (Resend/Postmark).
Hoje: o fluxo de recuperação está **completo e funcional**; sem credenciais, o link de
redefinição é registrado no log do servidor em vez de enviado por e-mail
(`src/server/mail.ts`, driver `console`). Basta preencher `SMTP_*` ou `RESEND_API_KEY`.
