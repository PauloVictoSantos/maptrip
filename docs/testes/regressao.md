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
- [ ] Início: aba da cidade (`near` obrigatório, raio 30 km), filtro de categoria, "em alta" com foto/nota
- [ ] Viagens: só participantes leem/editam (404 para os outros); só o dono convida/remove/exclui; convite só para amigos mútuos; `version` → 409; limites (30 dias, 20 paradas/dia, 10 pessoas, 200 gastos); validação de paradas/gastos
- [ ] Ranking: só visitas públicas contam; escopo cidade exige cidade no perfil; empates; variação de posição
- [ ] Destino: agregação por lugar; "quem você segue e já foi" respeita a visibilidade
- [ ] Configurações: visibilidade padrão (inválida → 400; não aparece no perfil público); troca de senha (senha atual errada → 403); exportação LGPD; exclusão de conta (senha errada → 403; apaga posts, fotos, comentários, curtidas, follows, viagens e corrige contadores)
- [ ] Conquistas: cálculo de selos, sequência semanal e carimbos de bairro (`lib/achievements.ts`)
