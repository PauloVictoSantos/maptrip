---
name: perf-report
description: Use ao fechar um item de performance do MapTrip ou ao atualizar o baseline. Roda os benchmarks disponíveis (explain, bundle, k6, Lighthouse) e escreve a tabela antes/depois em docs/perf/.
---
# perf-report

1. Rode o que existir, sempre com o mesmo dataset e a mesma máquina do baseline:
   - explain das queries quentes (skill `mongo-index-review`);
   - "First Load JS" por rota (build de produção em pasta separada se o dev estiver aberto);
   - k6 smoke/peak (skill `load-test`);
   - Lighthouse CI das páginas: `/`, `/login`, `/feed`, `/map`, `/buscar`, `/lugar`, `/profile/[u]`.
2. Monte a tabela: **métrica | meta | antes | depois | Δ | comando**. Marque ✅/❌ contra a meta do CLAUDE.md.
3. Salve em `docs/perf/NN-<item>.md` e atualize o resumo em `docs/perf/99-resultado-final.md`.
4. Nunca compare números de máquinas/datasets diferentes sem dizer isso explicitamente.
