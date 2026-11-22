---
description: Roda explain("executionStats") de uma query/rota do MongoDB e diz se viola o orçamento (COLLSCAN, docsExamined/nReturned, SORT em memória)
argument-hint: "<rota da API ou descrição da query>"
---
Use a skill `mongo-index-review` para: $ARGUMENTS

- Copie a query exata do código (filtro, sort, projeção, limit).
- Rode o explain contra o banco configurado em modo somente leitura (nunca imprima a connection string).
- Mostre: estágios do plano vencedor, índice usado, keys/docs examinados, nReturned, tempo.
- Diga se viola o orçamento e proponha o índice (regra ESR) com a migration e o teste que travaria a correção. Não crie o índice sem aprovação.
