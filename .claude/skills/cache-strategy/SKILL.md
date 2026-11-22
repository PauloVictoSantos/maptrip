---
name: cache-strategy
description: Use ao adicionar cache no MapTrip (HTTP ou Redis). Cache-aside com TTL e jitter, invalidação por evento (escrita ou change stream), single-flight contra stampede, e testes de hit, miss e invalidação.
---
# cache-strategy

1. **Classifique** a leitura (Classe 2 ou 3, `docs/adr/requests-priority.md`) e defina TTL + `stale-while-revalidate`.
2. **Chave**: inclua tudo que muda a resposta (rota, parâmetros normalizados, **id do visitante quando a resposta depende de visibilidade**). Nunca cachear resposta personalizada sob chave pública.
3. **Cache-aside (Redis)**: `get` → hit devolve; miss → **single-flight** (lock curto `SET key:lock NX PX`) para só uma requisição ir ao Mongo; as demais esperam/reusam. TTL com jitter (±10–20 %).
4. **Invalidação por evento**: a escrita (ou um change stream) apaga/atualiza as chaves afetadas; contadores via delta, não recomputando tudo.
5. **HTTP**: `ETag` estável (hash do conteúdo/versão) + `If-None-Match` → 304 sem corpo; `Cache-Control` por classe; sob falha do banco, servir valor vencido com `X-Cache: STALE`.
6. **Testes**: miss popula; hit não chama o Mongo (spy de comandos); escrita invalida; 1.000 chamadas concorrentes na mesma chave = 1 query; `If-None-Match` válido → 304 sem corpo; resposta de um usuário nunca aparece para outro.
