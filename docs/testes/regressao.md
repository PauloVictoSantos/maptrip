# Testes de regressão — o que está travado

Cada comportamento que passou a funcionar ganha uma linha aqui (skill `regression-guard`, Regra 8).

| # | Comportamento protegido | Teste | Comando | Desde (commit) |
|---|---|---|---|---|
| — | _(ainda não há testes; a Fase 0.5 cria os testes de caracterização dos fluxos críticos)_ | | | |

## Fluxos críticos que precisam de teste de caracterização (Fase 0.5)

- [ ] Cadastro, login (senha errada, rate limit), logout, `auth/me`, middleware de páginas protegidas
- [ ] Visibilidade: pública / amigos mútuos / privada — em feed, mapa, perfil, post, comentários e curtidas (IDOR)
- [ ] Criar visita (obrigatórios, validação, questionário) e excluir (só o dono; apaga comentários, curtidas e fotos)
- [ ] Upload (tipo real por magic bytes, limite de 5 MB) e `/api/media`
- [ ] Feed amigos/descobrir (cursor, último comentário, tags, nível do registro)
- [ ] Sidebar (em alta, amigos no mapa, sugestões)
- [ ] Mapa (camadas, filtros, `following` para o pino com foto)
- [ ] Busca (parser, filtros, ordenação, paginação)
- [ ] Página do lugar (agregação e resumo do questionário)
- [ ] Perfil (contadores, visitas, editar, avatar só do próprio usuário)
- [ ] Curtir (idempotente), comentar, seguir/deixar de seguir, salvar lugar
