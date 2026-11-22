---
name: security-checklist
description: Use em todo PR/commit do MapTrip que toque API, autenticação, uploads, banco ou dependências. Checklist OWASP Top 10 + NoSQL injection; cada correção ganha teste que reproduz o ataque.
---
# security-checklist

Marque cada item (✅ / ❌ / n.a.) no relatório do item:

- [ ] **Entrada validada com Zod** (tipos, tamanhos, enums); objetos com `$`-operadores e chaves com `$`/`.` rejeitados; ids via `toObjectId`.
- [ ] **Nenhum filtro Mongo montado direto** de `req.body`/query; sem `$where`/JavaScript no servidor.
- [ ] **Autorização no servidor** para o recurso exato (dono/visibilidade) — teste de IDOR com outro usuário.
- [ ] **Sessão**: cookie httpOnly + Secure (prod) + SameSite; expiração; logout invalida; rate limit em login/cadastro.
- [ ] **CSRF**: escritas só com cookie SameSite + JSON; nada de GET que altera estado.
- [ ] **XSS**: nada de `dangerouslySetInnerHTML` com dado do usuário; HTML gerado para Leaflet escapado.
- [ ] **Uploads**: magic bytes, limites, EXIF/GPS removidos, storage isolado.
- [ ] **SSRF**: o servidor não busca URL arbitrária vinda do cliente.
- [ ] **Mass assignment**: só campos permitidos são gravados (ex.: `users/me` aceita só nome/bio/cidade/avatar).
- [ ] **Headers**: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy; CORS restrito.
- [ ] **Segredos** só em env; nada em código, log ou resposta.
- [ ] **Dependências**: `npm audit --omit=dev` sem alta/crítica; versões sem CVE conhecido.
- [ ] **LGPD**: dados mínimos, logs sem dados pessoais, exportar/excluir conta.
- [ ] Cada correção tem **teste que reproduz o ataque** e prova o bloqueio.
