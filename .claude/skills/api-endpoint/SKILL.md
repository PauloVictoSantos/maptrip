---
name: api-endpoint
description: Use ao criar ou alterar um endpoint da API do MapTrip (src/app/api/**). Garante camadas (route → service → repository), validação Zod de entrada e saída, autorização por recurso, cache, rate limit, logs e os testes exigidos pela Regra 8.
---
# api-endpoint

1. **Contrato primeiro**: schemas Zod de entrada (query/body/params) e saída em `src/lib/contracts/<recurso>.ts`, compartilhados com o front. Strings com limite de tamanho; ids como `/^[a-f0-9]{24}$/`; nada de `z.any()`.
2. **Camadas**:
   - `route.ts`: só HTTP — parse com Zod (`safeParse` → 400), sessão (`getViewerId`), chama o service, monta resposta e headers.
   - `src/server/<recurso>/service.ts`: regra de negócio e autorização (dono, visibilidade via `visibleAnd`).
   - `src/server/<recurso>/repository.ts`: único lugar que fala com o MongoDB; sempre projeção, `limit`, `maxTimeMS`, paginação por cursor.
3. **Autorização**: checada no service para o recurso específico (evita IDOR). Nunca confiar em `user_id` vindo do cliente.
4. **NoSQL injection**: nunca passar `req.body`/query direto para um filtro; converter ids com `toObjectId`.
5. **Cache/headers** conforme a classe da requisição (`docs/adr/requests-priority.md`): `ETag`/`Cache-Control` em leituras; `Idempotency-Key` em escritas da Classe 1.
6. **Rate limit** por usuário/IP para escritas e endpoints caros.
7. **Logs** estruturados sem dados pessoais (sem email, sem token, sem corpo de foto).
8. **Testes** (skill `regression-guard`): contrato, feliz, erro, IDOR, entrada maliciosa e orçamento (`explain`/contagem de queries).
