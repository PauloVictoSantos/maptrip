---
description: Aciona a skill regression-guard para o último item concluído (testes + prova red-green + suíte completa + cobertura)
argument-hint: "[descrição opcional do item]"
---
Use a skill `regression-guard` para o último item concluído: $ARGUMENTS (se vazio, deduza pelo `git diff` desde o último commit).

Siga todos os passos da skill, mostre a prova red-green (saída falhando e passando), rode a suíte completa e a cobertura do código alterado. Depois peça ao subagent `regression-guardian` o veredito APROVADO/BLOQUEADO.
