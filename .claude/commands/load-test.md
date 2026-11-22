---
description: Roda um cenário k6 (smoke, peak, spike, soak, update-storm) contra o ambiente de TESTE e compara com os thresholds
argument-hint: "<cenário: smoke|peak|spike|soak|update-storm>"
---
Use a skill `load-test` para rodar o cenário: $ARGUMENTS (padrão: smoke).

- Confirme que o alvo é um banco/ambiente de teste. Se o `MONGODB_URI` apontar para o banco real, PARE e pergunte.
- Rode com `--summary-export` e mostre p50/p95/p99, taxa de erro e throughput por rota.
- Compare com os thresholds do CLAUDE.md e com o último resultado em `docs/perf/`.
