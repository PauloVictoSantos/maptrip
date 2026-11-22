# 0001. MongoDB com driver nativo e validação no app
- Status: aceita
- Data: 2026-11-21 (registrada em 2026-11-22)

## Contexto
O app saiu do Supabase/PostgreSQL para MongoDB (pedido do produto; MongoDB é obrigatório). Era preciso escolher entre Mongoose e o driver oficial.

## Decisão
Usar o **driver nativo `mongodb`** com tipos TypeScript por coleção (`src/lib/db/types.ts`), acesso centralizado em `src/lib/db/*` e validação no app. A Fase 1 adiciona schemas Zod compartilhados e `$jsonSchema` no servidor.

## Alternativas consideradas
- Mongoose — schemas e hooks prontos, mas camada extra, `lean()` obrigatório para performance e tipagem mais frouxa; sem ganho claro aqui.
- Prisma — suporte a MongoDB limitado (sem 2dsphere nativo, sem change streams).

## Consequências
- Controle total de projeção, `explain`, agregações e geo.
- Validação precisa ser feita à mão (Zod + `$jsonSchema`) — pendente da Fase 1.
- Índices hoje criados no primeiro acesso (`ensureIndexes`); passam a ser migrations (migrate-mongo) na Fase 1.

## Verificação
Testes de integração com MongoDB real em memória (Fase 0.5) e testes de índice (sem COLLSCAN).
