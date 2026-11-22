---
name: regression-guard
description: OBRIGATÓRIA. Use toda vez que uma funcionalidade, correção ou otimização do MapTrip passou a funcionar, ANTES de commitar e antes de passar ao próximo item. Escreve os testes que travam o comportamento, prova red-green, roda a suíte completa e confere a cobertura do código alterado.
---
# regression-guard

Só libere o commit quando todos os passos estiverem cumpridos e mostrados.

1. **Liste o comportamento que passou a funcionar.** Uma linha por comportamento observável (ex.: "`GET /api/map-pins?bbox=` retorna só pinos dentro da área", "curtir 2x não duplica").
2. **Escreva os testes** (Vitest; integração contra MongoDB em memória com replica set):
   - unit da regra de negócio (função pura em `src/lib/**`);
   - integração da rota (chame o Route Handler com `NextRequest` real e sessão de `signSession`);
   - **contrato**: valide a resposta com um schema Zod (formato que o front usa);
   - **erro**: entrada inválida → status e mensagem corretos;
   - **segurança**: IDOR (outro usuário não lê/escreve), entrada maliciosa (`{"$ne": null}`, `{"$gt": ""}`, chave `$where`, id inválido, string enorme);
   - **orçamento** (se for performance): `explain` sem COLLSCAN e `docsExamined/nReturned` limitado, ou número de comandos por request, ou tamanho de bundle.
   - Bug corrigido: um teste que reproduz o bug exatamente.
3. **Prove red-green.** Quebre de propósito a mudança (reverta o trecho, ou use `git stash` só do arquivo de produção) e rode o teste: ele tem que **falhar**. Restaure e rode de novo: tem que **passar**. Cole as duas saídas.
4. **Rode a suíte completa**: `npm run test:coverage` (ou `npm test`). Teste antigo quebrou? Pare e corrija o **código**. Só mude teste antigo se o requisito mudou, explicando no commit.
5. **Cobertura do código alterado ≥ 80%**: confira no relatório de cobertura as linhas dos arquivos tocados (`coverage/`). Abaixo disso, escreva mais testes.
6. **Registre** a linha em `docs/testes/regressao.md` (comportamento | teste | comando).
7. Só então commit convencional separado. Proibido: `.skip`, `.only`, `xit`, `xdescribe`, apagar teste, afrouxar assert, baixar threshold.
