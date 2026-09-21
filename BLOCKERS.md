# Pendências que dependem de você

Nada aqui impede o resto de funcionar. Tudo o que não depende de credencial ou de conteúdo seu
já está pronto e testado. Estes itens precisam de você porque exigem **uma conta, uma senha ou o
seu material**.

---

## 1. Publicar no Railway (credenciais)

**O que falta:** criar o projeto no Railway, o banco PostgreSQL e o Storage Bucket.

**O que fazer:** siga [`docs/DEPLOY-RAILWAY.md`](docs/DEPLOY-RAILWAY.md). São ~20 minutos e o
guia é copiar e colar. O passo mais importante é o **5** (CORS do bucket), com um comando que
diagnostica tudo:

```bash
node --env-file=.env tools/check-storage.mjs --apply-cors
```

**Por que não foi feito por mim:** exige login na sua conta do Railway e credenciais do bucket.
Sem elas, a plataforma roda com Postgres local e arquivos em disco local — funciona para ver e
testar, mas não para produção.

**Nota honesta:** o upload direto ao bucket, a URL assinada de leitura e o upload em partes estão
implementados e testados contra o driver local (que reproduz a mesma interface). Contra o bucket
real do Railway ainda **não foram exercitados**, porque não há credenciais aqui. O script acima
faz exatamente essa validação em segundos, assim que você tiver as variáveis.

## 2. Os vídeos e a apostila (conteúdo)

**O que falta:** gravar/enviar os vídeos das aulas e anexar a apostila e o material
complementar.

**O que já está pronto:** os 3 cursos com título, preço, carga horária, módulos, 35 aulas com
ementa, textos de várias aulas e uma atividade de exemplo. Tudo editável pelo painel.

**O que fazer:** **Painel → Cursos → Conteúdo →** abra cada aula, envie o vídeo e anexe os
materiais. Em **Perfil do tutor**, você pode trocar a foto e completar bio, formação e redes
sociais (Instagram, LinkedIn, YouTube, site) — hoje só o WhatsApp está preenchido.

## 3. Segurança antes de publicar

**O que fazer:** as contas de demonstração têm senhas conhecidas (`araujo2024` e `aluno2024`).
Ao criar o tutor em produção (passo 6 do guia de deploy), use sua própria senha e **apague a
conta "Maria Souza"** (Painel → Alunos).

## 4. E-mail de recuperação de senha (opcional)

**Situação:** o fluxo está completo. Sem SMTP, o link de redefinição aparece só no log do
servidor. Enquanto isso, o tutor gera o link em **Painel → Alunos → (aluno) → Gerar link de
redefinição** e envia pelo WhatsApp.

**Para automatizar:** preencha `MAIL_DRIVER=smtp` e as variáveis `SMTP_*` (veja o guia).

## 5. Pagamento automático (decisão sua, sem pressa)

**Situação:** o fluxo atual não usa gateway. O aluno vê o preço, escolhe PIX ou cartão e faz o
pedido; você combina o pagamento pelo WhatsApp e libera o acesso em **Painel → Solicitações**
com um clique. O curso bônus entra sozinho.

**Se um dia quiser cobrança automática** (Mercado Pago, Asaas, Stripe…): o ponto de integração é
único — chamar `approveRequestAction` quando o gateway confirmar o pagamento
(`src/server/actions/requests.ts`). Nada mais muda.

## 6. Domínio próprio (opcional)

Depois de apontar o domínio no Railway, atualize `APP_URL` e rode o comando do item 1 de novo
(o CORS do bucket precisa conhecer o endereço novo).
