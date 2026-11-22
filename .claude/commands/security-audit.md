---
description: Auditoria de segurança (OWASP Top 10 + NoSQL injection + dependências) do diff atual ou de uma área
argument-hint: "[área opcional, ex.: upload, auth, api/posts]"
---
Use o subagent `security-reviewer` e a skill `security-checklist` em: $ARGUMENTS (se vazio, no diff atual `git diff` + `git diff --cached`; sem diff, no projeto todo).

Inclua `npm audit --omit=dev`. Para cada achado: severidade, arquivo:linha, cenário de ataque, correção e o teste que provaria o bloqueio. Não altere código de produção sem aprovação.
