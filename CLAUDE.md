# MapTrip — guia do projeto para o Claude Code

Rede social de viagens com mapa (visitas, fotos, lugares, feed, seguidores, comentários, curtidas).
Objetivo atual: deixar o sistema **rápido, escalável, seguro e testável sem quebrar nada**.
Plano e métricas: `docs/perf/00-baseline.md`. Decisões: `docs/adr/`.

## Stack (detectada em 2026-11-22)

| Camada | Tecnologia | Onde |
|---|---|---|
| App | Next.js 15.1.0 (App Router) + React 19 + TypeScript `strict` | `src/app` |
| API | Route Handlers do Next (sem camada de serviço ainda) | `src/app/api/**/route.ts` |
| Banco | **MongoDB 8.0 no Atlas** (replica set), **driver nativo** `mongodb@7` (sem Mongoose) | `src/lib/db/*` |
| Auth | Sessão própria: bcrypt + JWT HS256 (jose) em cookie httpOnly, 30 dias | `src/lib/auth/*`, `src/middleware.ts` |
| Fotos | GridFS (bucket `media`) servido por `/api/media/[id]` ⚠️ (ver ADR 0003) | `src/app/api/upload`, `src/app/api/media` |
| Mapa | Leaflet 1.9 + leaflet.markercluster, tiles OpenStreetMap | `src/components/map` |
| UI | Tailwind 3 (tokens `mt-*`), lucide-react | `tailwind.config.ts` |
| Geocoding | Nominatim (OSM) chamado pelo navegador | busca, lugar, formulário |
| Testes | **nenhum ainda** (Fase 0.5 cria) | — |

**O banco é MongoDB e continua sendo MongoDB.** Não propor migração para SQL.

## Comandos

| Ação | Comando | Estado |
|---|---|---|
| Dev | `npm run dev` | ok |
| Build | `npm run build` | ok — **não rode enquanto o `npm run dev` do usuário estiver aberto** (sobrescreve `.next`) |
| Typecheck | `npx tsc --noEmit -p .` | ok |
| Lint | `npm run lint` | ⚠️ sem config ESLint flat ainda (Fase 0.5) |
| Testes | `npm test` / `npm run test:coverage` | planejado (Fase 0.5) |
| E2E | `npm run test:e2e` (Playwright) | planejado |
| Carga | `npm run load:smoke` (k6) | planejado |
| Orçamento de perf | `npm run perf:budget` | planejado |
| Seed demo (Manaus) | `node scripts/seed-manaus.mjs --me <username>` | ok |

Segredos só em `.env` / `.env.local` (fora do git). Nunca imprimir `MONGODB_URI` ou `AUTH_SECRET`.

## Convenções

- TypeScript estrito; nada de `any` novo sem justificativa em comentário.
- Toda query de posts passa pelas regras de visibilidade de `src/lib/db/access.ts` (`visibleAnd`). Nunca filtrar visibilidade só no front.
- Ids vindos do cliente: sempre `toObjectId()`; nunca montar filtro Mongo direto de `req.body`/query string.
- Respostas JSON com o mesmo formato que o front já usa (ver `src/lib/db/serialize.ts`).
- Commits: **Conventional Commits** (`feat:`, `fix:`, `perf:`, `test:`, `refactor:`, `docs:`, `chore:`), um item por commit.
- Textos de interface em português do Brasil.

## Orçamento de performance (metas)

- **Web (p75 mobile 4G):** LCP < 2,5 s · INP < 200 ms · CLS < 0,1 · TTFB < 800 ms · Lighthouse ≥ 90 · JS inicial < 170 KB gzip · imagem acima da dobra < 200 KB
- **API:** p50 < 100 ms · p95 < 300 ms · p99 < 800 ms · erro < 0,1 % · 2× o pico com CPU < 70 %
- **MongoDB:** p95 < 50 ms · zero COLLSCAN em caminho quente · `totalDocsExamined / nReturned ≈ 1` · cache WiredTiger > 95 % · zero N+1 · nenhum array sem limite · nenhum doc perto de 16 MB
- **Imagens/CDN:** cache hit > 95 % · AVIF/WebP em vários tamanhos

## REGRA 8 — TRAVA DE REGRESSÃO (obrigatória)

Toda vez que uma funcionalidade, correção ou otimização **estiver funcionando**, escreva testes automatizados que travem esse comportamento **antes** de commitar e antes do próximo item:

- a. Use a skill `regression-guard` a cada item concluído.
- b. Prove red-green: o teste **falha** sem a mudança (ou com ela revertida/quebrada de propósito) e **passa** com ela. Mostre a evidência.
- c. Cada bug corrigido ganha um teste de regressão que reproduz o bug.
- d. Cada otimização ganha um teste de orçamento (`explain` sem COLLSCAN, p95 do k6, tamanho de bundle, contagem de queries contra N+1).
- e. Cada endpoint novo/alterado ganha: contrato (schema Zod), caso feliz, caso de erro, autorização (IDOR) e entrada maliciosa.
- f. Rode a suíte **completa** antes do commit. Se um teste antigo quebrar, pare e corrija o **código**, nunca o teste. Só altere teste antigo se o requisito mudou, explicando no commit.
- g. Proibido: apagar teste, `.skip`/`.only`/`xit`/`xdescribe`, baixar threshold de cobertura ou afrouxar asserts.
- h. Sem teste novo no diff, sem commit.

Os hooks em `.claude/settings.json` aplicam parte disso automaticamente (ver abaixo), mas a regra vale mesmo onde o hook não alcança.

## DEFINITION OF DONE (todo item)

Imprima este checklist marcado ao terminar cada item (`/dod`):

- [ ] 1. Funciona (verificado de verdade, não só compilando)
- [ ] 2. Métrica antes/depois registrada em `docs/perf/`
- [ ] 3. Testes novos cobrindo o comportamento (Regra 8), com prova red-green
- [ ] 4. Suíte completa verde
- [ ] 5. Lint e typecheck verdes
- [ ] 6. Checklist de segurança aplicado (`security-checklist`)
- [ ] 7. Docs/ADR atualizados (`docs/adr/`, `docs/testes/regressao.md`)
- [ ] 8. Commit convencional separado

## Hooks ativos (`.claude/settings.json`)

| Evento | O que faz | Bloqueia? |
|---|---|---|
| PreToolUse Edit/Write | Recusa `.skip`/`.only`/`xit`/`xdescribe`/`fit` em arquivos de teste | sim |
| PreToolUse Bash (`git commit`) | Recusa se: `src/` mudou sem teste; teste focado/pulado; limite de cobertura baixou; suíte (`test:coverage` ou `test`) falha; `perf:budget` falha | sim |
| PostToolUse Edit/Write | ESLint do arquivo + `tsc --noEmit` + `vitest related` | devolve o erro ao Claude |
| Stop | Suíte completa se houve mudança em `src/`, `tests/`, `scripts/` | impede encerrar (uma vez) |

## Agentes, skills e comandos

- Subagents (`.claude/agents/`): `perf-auditor`, `db-architect`, `security-reviewer`, `test-engineer`, `regression-guardian`, `frontend-optimizer`.
- Skills (`.claude/skills/`): `regression-guard` (obrigatória), `api-endpoint`, `db-migration`, `mongo-index-review`, `image-pipeline`, `map-optimization`, `cache-strategy`, `load-test`, `perf-report`, `security-checklist`, `adr-writer`, `release-checklist`.
- Comandos (`.claude/commands/`): `/perf-check`, `/db-explain`, `/load-test`, `/security-audit`, `/add-regression-test`, `/dod`.

## Decisões de arquitetura (ADRs)

- `docs/adr/0001-mongodb-driver-nativo.md` — driver nativo + validação no app (aceita)
- `docs/adr/0002-sessao-jwt-cookie.md` — sessão própria em cookie (aceita, revisão na Fase 5)
- `docs/adr/0003-fotos-gridfs-temporario.md` — GridFS é provisório; sair na Fase 3 (aceita como dívida)
- `docs/adr/0004-modelagem-visitas.md` — embed de mídia/respostas, coleções para likes/follows/comments (aceita)
- `docs/adr/requests-priority.md` — classes de requisição (a criar na Fase 2.5)
