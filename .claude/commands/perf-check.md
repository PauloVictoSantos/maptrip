---
description: Mede a performance atual (explain das queries quentes, bundle, k6 smoke se disponível) e compara com o orçamento do CLAUDE.md
argument-hint: "[rota ou área opcional, ex.: mapa]"
---
Use o subagent `perf-auditor` e a skill `perf-report` para medir a performance de: $ARGUMENTS (se vazio, todas as rotas quentes).

1. explain("executionStats") das queries quentes (skill `mongo-index-review`).
2. Contagem de queries por request nas rotas principais (feed, sidebar, mapa, busca, lugar, perfil).
3. Bundle "First Load JS" — só rode `next build` se não houver `npm run dev` aberto; senão use o último resultado registrado e diga isso.
4. k6 smoke se o k6 estiver instalado e houver banco de teste.

Responda com a tabela métrica | meta | atual | status e aponte as 3 maiores violações do orçamento.
