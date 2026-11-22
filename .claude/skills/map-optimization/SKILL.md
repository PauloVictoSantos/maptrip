---
name: map-optimization
description: Use ao mexer no mapa do MapTrip (API de pinos e componentes Leaflet). Consulta só o viewport com $geoWithin, clustering por zoom no servidor ou supercluster, cache por célula, debounce/AbortController no cliente e testes de carga do endpoint do mapa.
---
# map-optimization

1. **API por viewport**: `GET /api/map-pins?bbox=w,s,e,n&zoom=z&layer=...` com `location: { $geoWithin: { $box: [[w,s],[e,n]] } }` + filtro de visibilidade + projeção mínima (id, lat, lng, categoria, nota, autor resumido). Limite rígido de pontos por resposta.
2. **Clustering**:
   - zoom baixo → agregação por célula (geohash/grade por zoom) no servidor, devolvendo `{cell, count, lat, lng}`; cachear por `(layer, zoom, célula)` no Redis e na CDN quando a camada é pública;
   - zoom alto → pontos individuais (supercluster no cliente se houver centenas).
3. **Cliente**: debounce de 300–500 ms no `moveend`; `AbortController` cancela a requisição anterior; não recria todos os marcadores a cada resposta (diff por id); para milhares de pontos, camada canvas/WebGL em vez de DOM.
4. **Índice**: 2dsphere em `location` com prefixo de igualdade quando houver (`visibility`). Valide com a skill `mongo-index-review`.
5. **Testes**: pinos fora do bbox não voltam; camada "amigos" respeita visibilidade (IDOR); bbox inválido/gigante → 400 ou limitado; explain sem COLLSCAN; k6 do endpoint com p95 dentro do orçamento (skill `load-test`).
