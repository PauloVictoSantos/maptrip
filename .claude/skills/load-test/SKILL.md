---
name: load-test
description: Use para criar ou rodar testes de carga k6 do MapTrip (cenários pico, soak, spike e "tempestade de atualizações") com thresholds que falham o CI quando o p95/p99 ou a taxa de erro estouram o orçamento.
---
# load-test

1. **Pré-requisitos**: k6 instalado; app rodando em build de produção (`next start`) contra um banco **de teste** com seed volumétrico — nunca contra o banco de produção.
2. **Cenários** em `k6/`:
   - `smoke.js`: 1–5 VUs, 1 min (roda no CI);
   - `peak.js`: rampa até 2× o pico atual;
   - `spike.js`: salto súbito (×10 em 10 s);
   - `soak.js`: carga média por 1–2 h (vazamento de memória/conexões);
   - `update-storm.js`: muitas curtidas/contadores (Classe 3) + ações Classe 1 em paralelo.
3. **Fluxos**: login → feed (amigos/descobrir) → mapa por viewport → busca → lugar → curtir/comentar. Sessões criadas antes do teste (não medir bcrypt em toda iteração).
4. **Thresholds** (do CLAUDE.md): `http_req_duration{p(95)}<300`, `p(99)<800`, `http_req_failed<0.001`; por tag de rota e por classe de prioridade.
5. Salve o resumo (`--summary-export`) em `docs/perf/` e compare com o baseline (skill `perf-report`).
