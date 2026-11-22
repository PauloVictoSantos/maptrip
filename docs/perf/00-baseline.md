# 00 — Baseline e diagnóstico (Fase 0)

- Data: 2026-11-22 · Commit base: `53b1ff6` · Máquina: notebook de desenvolvimento (Windows 11), app em `next dev`
- Banco: **MongoDB 8.0.39 no Atlas**, replica set `atlas-shicb3-shard-0`, driver nativo `mongodb@7.9.1` (sem Mongoose)
- Dataset: **pequeno** (seed de demonstração): 11 usuários, 97 posts, 61 comentários, 259 curtidas, 25 follows, 120 fotos no GridFS (3,5 MB)

> ⚠️ Com 97 posts, tempos absolutos de query não dizem nada sobre escala. O que este baseline mede com confiança: **planos de execução**, **número de idas ao banco por request**, **latência de rede até o Atlas**, **tamanho de bundle** e **padrões de código** que crescem mal. Medidas sob volume (k6, p95 com 1 M posts) dependem da Fase 1 (seed volumétrico) — ver "Lacunas".

## 1. Medições

### 1.1 Rede até o banco

| Métrica | Valor | Comando |
|---|---|---|
| RTT `ping` ao Atlas (p50 / p95, 30 amostras) | **61,1 ms / 67,3 ms** | script de scratch com `db.command({ping:1})` |
| Query do feed "descobrir" ponta a ponta (p50 / p95, 20 amostras) | **63,4 ms / 71,4 ms** | `find({visibility:"public"}).sort({created_at:-1}).limit(11)` |

Conclusão: o custo de cada query aqui é ~100 % rede. **O tempo de uma rota ≈ nº de idas sequenciais ao banco × RTT.** Em produção o app precisa rodar na mesma região do cluster (RTT ~1 ms); ainda assim, reduzir idas sequenciais é o maior ganho imediato.

### 1.2 Idas ao banco por request (lido do código)

| Rota | Queries | Idas sequenciais | Piso de latência com RTT 61 ms | Onde |
|---|---|---|---|---|
| `GET /api/feed/sidebar` | ~14 | ~11 | **~670 ms** | `src/app/api/feed/sidebar/route.ts` |
| `GET /api/feed?tab=friends` | 7 | 6 | **~370 ms** | `src/app/api/feed/route.ts` + `src/lib/db/access.ts` (`followingIds` é chamado 2×) |
| `GET /api/users/[username]` | 6 | 4 | ~245 ms | `src/app/api/users/[username]/route.ts` |
| `GET /api/users/[username]/visits` | 4 | 4 | ~245 ms | idem `/visits` |
| `GET /api/map-pins?layer=friends` | 5 | 5 | ~305 ms | `src/app/api/map-pins/route.ts` |
| `GET /api/media/[id]` (cada foto) | 2 + chunks | 2 | ~120 ms **por imagem**, bytes passam pelo Node | `src/app/api/media/[id]/route.ts` |
| `GET /api/search` | 1 (até 1.000 docs) | 1 | 61 ms + transferência | `src/app/api/search/route.ts` |
| `GET /api/auth/me` | 1 | 1 | 61 ms, em **todo** carregamento de página | `src/hooks/useAuth.ts` |

Uma abertura do feed dispara: `auth/me` + `feed` + `sidebar` + ~10–30 fotos/avatares via `/api/media` (cada uma passando pelo Node e pelo Atlas).

### 1.3 Planos de execução (`explain("executionStats")`)

| Query quente | Plano vencedor | keys / docs / retornados | Diagnóstico |
|---|---|---|---|
| Feed descobrir | `IXSCAN(visibility_1_created_at_-1)` | 11 / 11 / 11 | ✅ ótimo |
| Feed amigos | `SORT_MERGE` de 6× `IXSCAN(user_id_1_created_at_-1)` | 15 / 11 / 11 | ✅ hoje; ⚠️ um ramo por pessoa seguida → cresce com nº de seguidos |
| Mapa comunidade | `IXSCAN(visibility_1_created_at_-1)` | 84 / 84 / 84 | ❌ **sem filtro de área**: devolve todos os públicos até 500 |
| Busca (raio 10 km) | `IXSCAN(visibility_1_created_at_-1)` + filtro geo no FETCH | 84 / 84 / 75 | ❌ **ignora o 2dsphere**: lê todos os posts públicos e filtra a área depois; com 1 M posts lê até 1.000 docs para achar poucos |
| Lugar (150 m) | `IXSCAN(location_2dsphere)` + `SORT` em memória | 21 / 13 / 8 | ⚠️ ok em volume baixo; nome comparado em JS |
| Sidebar "em alta" | `IXSCAN(visibility_1_created_at_-1)` | 18 / 18 / 18 | ⚠️ varre até 1.000 posts/semana e agrega em JS a cada request |
| Perfil — visitas | `IXSCAN(user_id_1_created_at_-1)` | 10 / 10 / 10 | ⚠️ sem paginação (até 500 por request) |

Profiler do banco (`db.setProfilerLevel`) **não é acessível** no tier atual do Atlas (`AtlasError`): usar o Query Profiler/Performance Advisor do Atlas (UI) — pendente de acesso.

### 1.4 Bundle (Next build, "First Load JS", gzip)

Última build de produção feita nesta sessão (após a migração para MongoDB; antes das mudanças de avatar no mapa):

| Rota | First Load JS | Meta < 170 KB |
|---|---|---|
| compartilhado | 106 KB | — |
| `/feed` | 123 KB | ✅ |
| `/buscar` | 122 KB | ✅ |
| `/post/new` | 125 KB | ✅ |
| `/profile/[username]` | 122 KB | ✅ |
| `/lugar` | 121 KB | ✅ |
| `/map` | 108 KB (+ chunk do Leaflet carregado sob demanda) | ✅ (chunk dinâmico não medido) |
| middleware | 37 KB | — |

O JS está dentro do orçamento. O problema de LCP é outro: **todas as páginas são client-side** (`"use client"` + `fetch` em `useEffect`), então o conteúdo só aparece depois de JS + `auth/me` + API.

### 1.5 Imagens

| Métrica | Valor |
|---|---|
| Armazenamento | GridFS dentro do MongoDB (bucket `media`) |
| Entrega | Rota Node lê o arquivo inteiro para a memória (`Buffer.concat`) e responde |
| Variantes / formatos | **nenhuma**: o mesmo arquivo serve miniatura e tela cheia; uploads reais podem ter até **5 MB** |
| Seed atual | média 30 KB, máx. 86 KB (ilustrações 1200×800) |
| EXIF/GPS | **não removido** no upload |
| CDN | nenhuma |

### 1.6 Dependências (`npm audit --omit=dev`)

**5 vulnerabilidades: 1 crítica, 4 altas** — `next@15.1.0` (inclui DoS por cache poisoning, injeção em Image Optimization e o bypass de middleware CVE-2025-29927, corrigido em 15.2.3) e `sharp` (libvips/libheif/librsvg) trazido pelo Next.

## 2. Os 10 maiores gargalos (ranqueados por impacto × esforço)

| # | Gargalo | Evidência | Impacto | Esforço | Fase |
|---|---|---|---|---|---|
| 1 | **Fotos no GridFS servidas pelo Node**, sem variantes nem CDN | §1.5; `api/media/[id]` faz 2 idas ao Atlas e bufferiza o arquivo; cada miniatura baixa o original (até 5 MB) | Muito alto (banda, memória, latência; trava sob carga) | Médio | 3 |
| 2 | **Muitas idas sequenciais ao banco por request** (feed 6, sidebar 11) + `followingIds` duplicado | §1.2; `access.ts` chama `followingIds` dentro de `friendIds` | Alto (piso de 370–670 ms com o RTT atual) | Baixo | 1/2 |
| 3 | **Mapa sem filtro de viewport**: até 500 posts completos por request, sem cache, marcadores DOM | explain "mapa comunidade"; `map-pins/route.ts` `.limit(500)` | Alto (payload e DOM crescem com a base) | Médio | 1/4 |
| 4 | **Busca não usa o índice geoespacial** e agrega até 1.000 posts em JS a cada request | explain "busca": `docsExamined` = todos os públicos; `search/route.ts` `SCAN_LIMIT` | Alto | Médio | 1 |
| 5 | **Sidebar do feed recalculada a cada abertura** (em alta, sugestões, amigos no mapa) com N+1 em contagens | `feed/sidebar/route.ts` (1 `countDocuments` por sugestão, lido até 2.000 follows e 1.000 posts a cada abertura) | Alto | Médio (materialized view `$merge` + cache) | 1/2 |
| 6 | **Front sem cache de dados**: toda navegação refaz `auth/me` + APIs, sem dedupe; páginas 100 % client-side (LCP) | `useAuth.ts`, `feed/page.tsx`, `lugar/page.tsx` | Alto (LCP/TTFB percebidos) | Médio | 2.5/4 |
| 7 | **Dependências com CVE crítico/alto** (Next 15.1.0, sharp) | §1.6 | Alto (segurança) | Baixo | 5 (adiantar) |
| 8 | **EXIF/GPS não removido** das fotos (privacidade/LGPD) | `api/upload/route.ts` grava o arquivo original | Alto (privacidade) | Baixo | 3 (adiantar) |
| 9 | **Estado em memória**: rate limit por instância; pool/timeouts do Mongo no padrão; sem `maxTimeMS`; índices criados no boot | `lib/rate-limit.ts`, `lib/db/mongo.ts` | Médio (impede escalar horizontalmente) | Baixo/Médio | 1/2 |
| 10 | **Tiles do OpenStreetMap direto** (política de uso proíbe tráfego pesado de apps) e **Nominatim chamado pelo navegador** a cada página de lugar/busca | `MapView.tsx`, `lugar/page.tsx`, `buscar/page.tsx` | Médio (risco de bloqueio em produção, latência externa) | Baixo/Médio | 4 |

Fora do top 10, registrados no backlog: paginação por cursor no perfil; `skip` em `/api/posts`; dados do autor via `loadUsers` em vez de Extended Reference; sessão JWT de 30 dias sem revogação; bcrypt vs argon2id; ausência de headers de segurança (CSP/HSTS); `next lint` sem configuração.

## 3. Cobertura de testes atual

**Zero.** Não há framework de testes, nem um único teste, nem CI. Fluxos críticos sem nenhum teste:

| Fluxo | Risco se quebrar |
|---|---|
| Cadastro, login, logout, sessão (`/api/auth/*`, middleware) | ninguém entra |
| Regras de visibilidade (pública / amigos mútuos / privada) em feed, mapa, perfil, post, comentários, curtidas | **vazamento de dados privados** |
| Registrar visita (validações, respostas do questionário) | perda de conteúdo |
| Upload de foto (tipo real, limite) e entrega (`/api/media`) | quebra de imagens / upload malicioso |
| Feed (abas, cursor, último comentário, tags) | tela principal |
| Mapa (camadas, filtros, pino com foto de quem você segue) | tela principal |
| Busca (parser de texto, filtros, ordenação, paginação) | descoberta |
| Página do lugar (agregação, resumo do questionário) | SEO/descoberta |
| Perfil (contadores, visitas, pontos/níveis, editar, avatar) | identidade |
| Curtir, comentar, seguir, salvar lugar | engajamento |

## 4. Lacunas do baseline (o que não foi possível medir agora e por quê)

| Medição pedida | Status | Motivo / como fechar |
|---|---|---|
| Lighthouse CI | ❌ | precisa de build de produção servida + Chrome headless; não rodo build com o seu `npm run dev` aberto → Fase 0.5 com pasta de build separada |
| k6 | ❌ | k6 não instalado; e não faz sentido contra 97 posts nem contra o banco real → Fase 1 (seed volumétrico em banco de teste) |
| Profiler do MongoDB (`slowms`) | ❌ | bloqueado no tier do Atlas → usar Query Profiler / Performance Advisor na UI do Atlas |
| clinic.js / 0x | ❌ | depende de carga (k6) para ter significado |
| Docker Compose local | ❌ | Docker não está instalado nesta máquina |

## 5. Plano das próximas fases (estimativas em dias de trabalho)

| Fase | Entrega | Estimativa |
|---|---|---|
| **0.5 Testes de caracterização** | Vitest + `mongodb-memory-server` (replica set) + ESLint flat + scripts (`test`, `test:coverage`, `perf:budget`); golden tests de **todas** as rotas atuais (contrato, feliz, erro, IDOR, entrada maliciosa) e das regras de visibilidade; Playwright nos fluxos críticos; build/Lighthouse em pasta separada | 3–5 |
| **0.6 Correções urgentes de segurança** | Next ≥ versão sem CVE (e sharp), remoção de EXIF/GPS no upload — cada uma com teste do ataque | 1–2 |
| **1 Banco** | seed volumétrico em banco de teste; migrate-mongo + `$jsonSchema`; índice geo com prefixo de igualdade para busca/mapa; mapa por viewport; cortar idas sequenciais (amigos calculados 1×, Extended Reference do autor); paginação por cursor; pool/timeouts/`maxTimeMS`; materialized views (`$merge`) para "em alta"/sugestões | 6–9 |
| **2 Backend** | camadas route → service → repository; Zod compartilhado; Redis (cache-aside, rate limit, single-flight); logs pino; health/readiness | 6–8 |
| **2.5 Requisições** | `docs/adr/requests-priority.md`; TanStack Query por classe; ETag/304; contadores em lote; Idempotency-Key; load shedding | 5–7 |
| **3 Imagens** | storage externo + URL pré-assinada + worker sharp (variantes AVIF/WebP, blurhash) + CDN; migração das fotos do GridFS | 4–6 |
| **4 Frontend** | SSR/ISR de lugar/perfil público; mapa com clustering no servidor/canvas; virtualização do feed; tiles de provedor com SLA; Lighthouse ≥ 90 | 5–7 |
| **5 Segurança** | argon2id, access curto + refresh rotativo, CSP/HSTS, testes de NoSQL injection e ZAP, LGPD (exportar/excluir conta) | 4–6 |
| **6 Infra** | Docker, CI GitHub Actions (lint → typecheck → testes → build → Lighthouse → k6 smoke), IaC conforme o provedor, runbook | 4–8 |
| **7 Testes avançados** | k6 pico/soak/spike/tempestade, Stryker nos serviços críticos, testes de migração up/down | 3–5 (intercalado) |
| **Total** | | **~41–63 dias** |

Ordem recomendada: **0.5 → 0.6 → 1 → 3 → 2 → 2.5 → 4 → 5 → 6**, porque sem testes de caracterização nenhuma otimização é segura; as correções de segurança são baratas e urgentes; e banco + imagens são os maiores gargalos medidos.

Itens do pedido que só entram **se os números provarem necessidade** (com ADR): sharding, Outlier Pattern, fan-out on write do feed, Kubernetes, GraphQL/BFF, microserviços. Com o volume atual, monólito modular + MongoDB bem indexado + cache + CDN cobrem várias ordens de grandeza de crescimento.
