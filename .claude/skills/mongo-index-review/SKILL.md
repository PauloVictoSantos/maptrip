---
name: mongo-index-review
description: Use para analisar ou criar índices do MongoDB no MapTrip. Roda explain("executionStats") das queries quentes, aplica a regra ESR, cria/remove índices com migration e gera teste que falha se a query fizer COLLSCAN ou examinar documentos demais.
---
# mongo-index-review

1. **Capture a query real** do código (filtro, sort, projeção, limit) — copie do repository/route, não reescreva de memória.
2. **Explain**: `collection.find(filtro).sort(sort).limit(n).explain("executionStats")` contra dados com volume realista (seed). Anote: estágio vencedor (`IXSCAN`/`COLLSCAN`/`SORT` em memória/`SORT_MERGE`), `totalKeysExamined`, `totalDocsExamined`, `nReturned`, `executionTimeMillis`.
3. **Diagnóstico**:
   - COLLSCAN em caminho quente → índice faltando.
   - `docsExamined/nReturned` ≫ 1 → índice não seletivo ou filtro aplicado no FETCH (ex.: geo filtrado depois de usar o índice de data).
   - `SORT` em memória → o sort não está no índice.
4. **Regra ESR**: campos de **Igualdade** primeiro, depois **Sort**, depois **Range**. Para geo: `{ visibility: 1, location: "2dsphere" }` ou 2dsphere com prefixo de igualdade.
5. **Crie/remova** pelo skill `db-migration`. Remova índices sem uso: `$indexStats` (ops = 0 após período representativo) e prefixos duplicados.
6. **Teste de orçamento** (Vitest): roda o explain da query do repository e falha se algum estágio for `COLLSCAN`, se o índice esperado não for o vencedor, ou se `totalDocsExamined > nReturned * fator` (fator documentado no teste).
7. Registre antes/depois em `docs/perf/`.
