---
name: adr-writer
description: Use sempre que o MapTrip tomar uma decisão de arquitetura relevante (modelagem, índice estrutural, cache, filas, storage, autenticação, infraestrutura, troca de biblioteca). Registra um ADR curto em docs/adr/.
---
# adr-writer

1. Próximo número: maior `docs/adr/NNNN-*.md` + 1. Nome: `NNNN-titulo-em-kebab-case.md`.
2. Modelo (em português):

```markdown
# NNNN. Título da decisão
- Status: proposta | aceita | substituída por NNNN | rejeitada
- Data: AAAA-MM-DD

## Contexto
O problema, com números (métricas, volume, custo) e restrições (ex.: MongoDB obrigatório).

## Decisão
O que foi decidido, em uma ou duas frases diretas.

## Alternativas consideradas
- Opção A — por que não.
- Opção B — por que não.

## Consequências
Positivas, negativas, riscos, o que precisa ser monitorado e como desfazer.

## Verificação
Teste(s) e métrica(s) que provam que a decisão está funcionando.
```
3. Atualize a lista de ADRs no `CLAUDE.md`. Se substituir um ADR antigo, marque o antigo como "substituída por".
