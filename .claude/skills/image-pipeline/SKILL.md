---
name: image-pipeline
description: Use ao mexer em upload, processamento ou entrega de fotos do MapTrip. Upload direto para object storage com URL pré-assinada, processamento com sharp (magic bytes, limites, remoção de EXIF/GPS, AVIF/WebP/JPEG em 320/640/1080/1920, blurhash) e testes de tipo, tamanho e privacidade.
---
# image-pipeline

1. **Upload**: o cliente pede `POST /api/uploads/sign` (autenticado, rate limit) → recebe URL pré-assinada do bucket (S3/R2) com `Content-Type` e tamanho máximo fixados → envia direto. O servidor Node nunca recebe os bytes.
2. **Processamento assíncrono** (fila/worker): baixa o original, valida **magic bytes** (JPEG/PNG/WebP/HEIC), limita dimensões (ex.: ≤ 8000 px por lado, ≤ 40 MP) e tamanho (≤ 15 MB).
3. **Privacidade**: `sharp().rotate()` (aplica orientação) e **sem** `withMetadata()` → remove EXIF, inclusive GPS. Só preservar localização se o usuário autorizar.
4. **Variantes**: 320/640/1080/1920 px de largura em AVIF + WebP + JPEG fallback; nome versionado por hash do conteúdo; blurhash/LQIP salvo nos metadados do post.
5. **Entrega**: CDN com `Cache-Control: public, max-age=31536000, immutable`; no front, `srcset`/`sizes`, `width`/`height` explícitos, `loading="lazy"` fora da dobra.
6. **Testes**: arquivo com extensão falsa é recusado; imagem acima do limite é recusada; foto com GPS sai **sem** GPS (ler EXIF da variante); todas as variantes geradas com as larguras certas; URL assinada expira e não aceita outro tipo/tamanho.
