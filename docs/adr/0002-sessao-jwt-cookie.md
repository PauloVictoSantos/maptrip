# 0002. Sessão própria: JWT assinado em cookie httpOnly
- Status: aceita (revisão prevista na Fase 5)
- Data: 2026-11-21 (registrada em 2026-11-22)

## Contexto
Na saída do Supabase Auth, o Auth.js para App Router (v5) ainda estava em beta. O app só usa email e senha.

## Decisão
Senha com **bcrypt (custo 12)**; sessão em **JWT HS256 (jose)** com `sub = userId`, cookie `mt_session` httpOnly, SameSite=Lax, Secure em produção, 30 dias. O middleware verifica a assinatura (sem ir ao banco); as rotas da API verificam de novo.

## Alternativas consideradas
- Auth.js v5 (beta) — dependência instável no momento.
- Sessão no banco/Redis — revogação fácil, mas uma ida ao banco por request.

## Consequências
- Stateless e rápido; escala horizontalmente.
- **Sem revogação** antes de 30 dias e sem rotação de token; bcrypt em vez de argon2id.
- Fase 5: access token curto + refresh token rotativo (revogável, guardado no Redis/Mongo), argon2id com rehash no login, MFA opcional.

## Verificação
Testes de login/cadastro/logout, de cookie (flags) e de rota protegida (Fase 0.5).
