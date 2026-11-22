# 0004. Modelagem das visitas, interações e lugares
- Status: aceita (ajustes previstos na Fase 1)
- Data: 2026-11-21 (registrada em 2026-11-22)

## Contexto
Padrões de acesso principais: feed (por autor/visibilidade/data), mapa e busca (por área), página do lugar (visitas próximas com o mesmo nome), perfil (visitas do autor).

## Decisão
- `posts`: **embed** do que é lido junto e tem limite — `media` (≤ 10 fotos) e `answers` (questionário, ≤ 60 chaves); `location` GeoJSON com índice `2dsphere`; contadores `likes_count`/`comments_count` atualizados com `$inc` (Computed Pattern).
- **Coleções próprias** para o que cresce sem limite: `likes` (único `user_id+post_id`), `follows` (único `follower_id+following_id`), `comments` (`post_id+created_at`).
- "Lugar" é derivado das visitas públicas (mesmo nome normalizado num raio de 150 m); `places`/`place_status` servem só à lista "Quero visitar / Já visitei".

## Alternativas consideradas
- Arrays de likes/seguidores no documento — proibido (crescimento sem limite, risco de 16 MB, escrita concorrente).
- Coleção `places` canônica para todas as visitas — melhor para agregados, mas exige deduplicação de lugares; avaliar na Fase 1 com dados reais.

## Consequências
- Autor do post é buscado à parte (`loadUsers`), 1 ida extra por request → Fase 1 avalia Extended Reference (nome/avatar no post) com atualização assíncrona ao editar o perfil.
- Agregados de lugar e "em alta" são calculados por request → Fase 1: materialized views com `$merge`.

## Verificação
Testes de índice (IXSCAN), de unicidade (curtir 2× não duplica) e de contadores (Fase 0.5/1).
