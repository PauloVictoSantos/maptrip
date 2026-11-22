# 0003. Fotos no GridFS (provisório) — sair na Fase 3
- Status: aceita como dívida técnica
- Data: 2026-11-21 (registrada em 2026-11-22)

## Contexto
Na migração para MongoDB não havia provedor de object storage definido. As fotos foram para o GridFS (bucket `media`) e são servidas por `/api/media/[id]`.

## Decisão
Manter o GridFS **apenas até a Fase 3**, quando as fotos vão para object storage (S3/R2/GCS) com upload por URL pré-assinada, processamento assíncrono (sharp: variantes AVIF/WebP/JPEG, remoção de EXIF/GPS, blurhash) e entrega por CDN.

## Alternativas consideradas
- Manter GridFS + cache de CDN na frente — ainda faria o Node e o banco carregarem bytes, sem variantes.
- Base64 no documento — proibido (limite de 16 MB, working set inflado).

## Consequências
- Hoje: cada foto custa 2 idas ao Atlas e memória no Node; sem miniaturas; EXIF/GPS não é removido (ver baseline §1.5).
- Migração: script que copia cada arquivo do GridFS para o bucket, gera variantes e reescreve as URLs nos posts/avatares (expand/contract).

## Verificação
Testes do pipeline (tipo real, tamanho, GPS removido, variantes) e métrica de CDN hit > 95 %.
