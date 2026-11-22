---
name: db-migration
description: Use ao mudar o esquema/índices/dados do MongoDB do MapTrip. Cria migration versionada com migrate-mongo, com up e down, padrão expand/contract, build de índice sem bloquear e teste de up/down.
---
# db-migration

1. **Nunca** altere índices/dados de produção à mão nem no boot da aplicação: tudo vira migration em `migrations/` (migrate-mongo, config em `migrate-mongo-config.js`, lendo `MONGODB_URI` do ambiente).
2. **Expand/contract** para mudanças de formato:
   - *expand*: adicione o campo/coleção novo e escreva nos dois formatos;
   - *migrate*: backfill em lotes (`bulkWrite`, 1.000 por vez, com retomada por `_id`);
   - *contract*: só depois que o código antigo saiu de produção, remova o campo antigo (migration separada).
3. **Índices**: `createIndex` com nome explícito. No Atlas/replica set o build não bloqueia leituras e escritas (MongoDB ≥ 4.2); para coleções enormes, prefira o rolling build do Atlas. Índice único: rode antes uma checagem de duplicados.
4. **`down`** sempre implementado e testado (remove índice/campo, restaura formato).
5. **Teste** (Vitest + MongoDB em memória): aplica `up`, valida o estado (índices via `listIndexes`, documentos migrados), aplica `down`, valida que voltou ao estado anterior. Rode também `up` duas vezes (idempotência).
6. Registre a decisão em ADR se mudar modelagem.
