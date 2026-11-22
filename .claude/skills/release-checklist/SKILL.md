---
name: release-checklist
description: Use antes e depois de publicar uma versão do MapTrip. Canary ou blue-green, migrations compatíveis, plano de rollback, smoke test pós-deploy e monitoramento de SLO.
---
# release-checklist

Antes:
- [ ] CI verde (lint → typecheck → testes → build → Lighthouse → k6 smoke).
- [ ] Migrations no padrão expand/contract: a versão anterior do app continua funcionando com o banco migrado.
- [ ] Feature flags para mudanças arriscadas, desligadas por padrão.
- [ ] Plano de rollback escrito: versão anterior do app + `down` da migration (se aplicável) + o que fazer com dados escritos no meio.
- [ ] Backup/PITR do Atlas confirmado.

Durante:
- [ ] Canary (5–10 % do tráfego) ou blue-green; observar 15–30 min: erro < 0,1 %, p95 < 300 ms, CPU < 70 %.

Depois (smoke test em produção):
- [ ] Login, feed (amigos/descobrir), mapa, busca, página de lugar, perfil, registrar visita com foto, curtir/comentar.
- [ ] Healthcheck e readiness ok; logs sem pico de erro; filas sem acúmulo.
- [ ] Se qualquer SLO estourar: rollback imediato, depois investigar.
