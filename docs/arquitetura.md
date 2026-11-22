# Arquitetura — atual vs. proposta

## Atual (2026-11-22)

```mermaid
flowchart LR
  B[Navegador<br/>React 19 client-side<br/>Leaflet] -->|HTML/JS| N[Next.js 15<br/>páginas + Route Handlers<br/>monólito]
  B -->|tiles| OSM[tile.openstreetmap.org]
  B -->|geocoding| NOM[Nominatim]
  B -->|"/api/media/:id (cada foto)"| N
  N -->|"driver nativo<br/>~6–11 idas por request"| A[(MongoDB Atlas 8.0<br/>replica set<br/>posts, users, likes...<br/>+ GridFS com as fotos)]
  N -. rate limit em memória .- N
```

Pontos fracos: fotos passam pelo Node e moram no banco; nenhum cache; estado em memória por instância; páginas só no cliente; serviços externos (tiles, geocoding) chamados direto do navegador.

## Proposta (alvo das Fases 1–6)

```mermaid
flowchart LR
  B[Navegador<br/>TanStack Query<br/>mapa canvas/supercluster] --> CDN[CDN<br/>estáticos, imagens,<br/>respostas públicas]
  CDN --> APP[App Next.js stateless<br/>SSR/ISR páginas públicas<br/>route → service → repository<br/>Zod em entrada e saída]
  B -->|PUT direto, URL pré-assinada| S3[(Object storage<br/>originais + variantes)]
  CDN --> S3
  APP --> R[(Redis<br/>cache-aside, rate limit,<br/>single-flight, idempotência)]
  APP --> M[(MongoDB Atlas<br/>replica set, mesma região<br/>índices ESR/2dsphere<br/>views materializadas)]
  APP --> Q[[Fila BullMQ]]
  Q --> W[Workers<br/>imagens sharp, contadores,<br/>notificações]
  W --> S3
  W --> M
  M -. change streams .-> APP
  APP --> T[Tiles/geocoding<br/>provedor com SLA via proxy + cache]
```

Princípios: monólito modular (sem microserviços prematuros); app sem estado para escalar horizontalmente; nada de bytes de imagem no Node; MongoDB continua sendo o banco principal.
