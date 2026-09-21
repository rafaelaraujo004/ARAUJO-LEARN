# ARAÚJO LEARN — Registro de Progresso

Use este arquivo para retomar o trabalho do ponto exato. Decisões e motivos: `DECISIONS.md`.
Pendências que dependem do Rafael: `BLOCKERS.md`.

## Fases

- [x] **Fase 1 — Fundação:** projeto, banco, autenticação própria, permissões, design system.
- [x] **Fase 2 — Cursos:** cursos, módulos, aulas, painel do tutor, catálogo, página do curso.
- [x] **Fase 3 — Vídeos e materiais:** upload direto ao bucket (multipart), player próprio, acesso protegido por URL assinada, materiais.
- [x] **Fase 4 — Aprendizado:** progresso, retomada, "continuar aprendendo", painel do aluno.
- [x] **Fase 5 — Atividades:** perguntas, correção no servidor, editor do tutor, integração com conclusão.
- [x] **Fase 6 — Certificados:** emissão automática, PDF com a marca, validação pública, revogação.
- [x] **Fase 7 — Refinamento:** copy, segurança (CSP, auditoria de actions, rate limit), páginas de erro, SEO, testes, CI, docs.

## Validado de ponta a ponta (navegador real)

pedido de matrícula → tutor libera → aluno reprova na atividade (feedback) → refaz e passa →
conclui as 14 aulas → curso concluído → certificado emitido → validação pública → PDF →
liberar 2º curso → bônus liberado automaticamente.

## Verificação atual

- `npm run verify` limpo (auditoria de 46 Server Actions, lint, tipos)
- 71 testes (unitários + 20 de regras de negócio contra Postgres real)
- `npm run build` de produção fecha (45 rotas)

## Log

- Marca: "A" do Rafael como favicon e símbolo; azul da interface alinhado ao logo (#0c2456).
- Copy reescrita: dor → resultado → custo de não saber → cursos → tutor → chamada.
- Fotos do tutor no topo, na seção "quem ensina" e na página do curso.
- Correção: cartão mostra "ou até 12x no cartão" em linha própria (não parecia valer no PIX).
- Achados e corrigidos durante a validação: diálogos deslocados, diálogo que não fechava após enviar,
  atividades de módulo/curso inacessíveis ao aluno, URL malformada derrubando a validação pública,
  código do certificado sem validação de formato, driver de storage dependendo de variável esquecível.

## Ainda não exercitado

Upload/leitura contra o **bucket real** do Railway (sem credenciais). Ver `BLOCKERS.md` item 1.
