# ARAÚJO LEARN — Decisões Técnicas e de Produto

> Documento vivo. Registra **o que foi decidido** e **por quê**, para que o trabalho
> possa ser retomado a qualquer momento sem perda de contexto.

---

## 1. Decisões Técnicas (tomadas de forma autônoma)

| Área | Decisão | Motivo |
|---|---|---|
| Linguagem | TypeScript (strict) | Segurança de tipos fim-a-fim, padrão de mercado |
| Framework | Next.js 15 (App Router) + React 19 | Frontend + API no mesmo deploy → 1 serviço no Railway, custo mínimo, SSR para SEO da área pública |
| Estilo | Tailwind CSS v4 + design system próprio (`src/styles/tokens.css`) | Identidade própria, zero dependência de template pronto |
| Banco | PostgreSQL (Railway Postgres) | Relacional, maduro, barato, nativo no Railway |
| ORM | Prisma 6 | Migrations versionadas, tipos gerados, produtividade |
| Autenticação | Própria: sessão opaca em cookie `httpOnly` + tabela `Session` no banco | Sem dependência de Firebase/Auth0; revogação real de sessão; simples de auditar |
| Hash de senha | `scrypt` (node:crypto) com salt por usuário | Zero dependências nativas (build previsível no Railway), recomendado por OWASP |
| Armazenamento | S3-compatível via `@aws-sdk/client-s3` **atrás da interface `StorageProvider`** | Railway Storage Bucket hoje; trocar por Cloudflare R2/Stream depois sem tocar no domínio |
| Upload de vídeo | **Direto do navegador para o bucket** via URL pré-assinada (multipart para arquivos grandes) | Não trafega GB pelo backend; suporta retomada por parte |
| Entrega de vídeo | URL assinada de curta duração (15 min), gerada só após checagem de matrícula no backend | Bucket permanece privado |
| Player | Componente próprio sobre `<video>` nativo | Controle total de UX e telemetria de progresso; sem dependência pesada |
| Validação | Zod (schemas compartilhados entre API e formulários) | Uma fonte de verdade |
| PDF (certificados) | `pdf-lib` | Puro JS, sem binários nativos |
| Testes | Vitest (unitário + integração de rotas) | Rápido, nativo com TS/ESM |
| CI | GitHub Actions (lint + typecheck + test + build) | Padrão, gratuito |
| Deploy | Railway (Nixpacks), `railway.json` versionado | Pedido do produto |
| Ícones | `lucide-react` | Tree-shakeable; escrever 60 ícones à mão não melhora tutor nem aluno |

### O que foi deliberadamente **evitado**
- Firebase (pedido explícito).
- Marketplace, múltiplos professores, pagamentos, gamificação, comunidade.
- Microserviços, filas, Redis, Elasticsearch — volume inicial não justifica.
- Bibliotecas de UI genéricas que dariam "cara de template".

---

## 2. Decisões de Negócio

O modo autônomo foi solicitado, então as regras de negócio abaixo foram **decididas com o
padrão mais seguro e reversível**. Todas são configuráveis sem alteração de schema.
Revise-as quando quiser — a coluna "Como mudar" indica o caminho.

| Pergunta | Decisão adotada | Como mudar |
|---|---|---|
| Curso gratuito ou pago? | **Gratuito com matrícula**: o aluno logado se matricula sozinho em cursos publicados marcados como `FREE`. Cursos `RESTRICTED` só por liberação do tutor. | Campo `Course.accessType` no painel do curso |
| Acesso permanente ou temporário? | **Permanente por padrão** (`Enrollment.expiresAt = null`). O campo já existe para acesso temporário futuro. | `Enrollment.expiresAt` |
| Certificado obrigatório? | **Emissão automática ao concluir 100% do curso**, se `Course.certificateEnabled = true` (padrão: true). | Toggle no painel do curso |
| Conteúdo visível para todos? | Aula pode ser marcada como **`isPreview`** (amostra pública). Padrão: não. | Toggle na aula |
| Atividade obrigatória para concluir? | **Sim, quando `Activity.isRequired = true`** (padrão: true para quizzes). Conclusão do curso exige 100% das aulas + atividades obrigatórias aprovadas. | Toggle na atividade |
| Nota mínima do quiz | **70%**, configurável por atividade (`passingScore`) | Campo na atividade |
| Quando a aula é "concluída"? | Vídeo: **≥ 92% assistido** (ou marcação manual). Aula sem vídeo: marcação manual / leitura confirmada. | `LESSON_COMPLETION_THRESHOLD` em `src/lib/constants.ts` |
| Quem pode se cadastrar? | Qualquer pessoa cria conta de **ALUNO**. Contas TUTOR/ADMIN só via promoção por um ADMIN ou seed. | Painel de alunos |
