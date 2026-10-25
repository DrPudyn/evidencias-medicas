# Auditoria de implementação — Evidências Médicas

Escopo: revisão local do projeto, autenticação administrativa, coleta de métricas, integração PubMed, catálogos de Cardiologia (SBC) e Endocrinologia (SBEM), e documentação. Revisão atualizada em 17/10/2026. O projeto não foi publicado nem ativou serviços externos de comunicação. Esta revisão técnica não é certificação de segurança nem parecer de conformidade legal.

## Achados e estado

| Gravidade | Achado | Estado e limite |
|---|---|---|
| Alta | Depois do código de e-mail, a consulta de `/api/admin/session` retorna `401` até concluir a segunda etapa WebAuthn. A interface tratava esse estado esperado como erro e reiniciava o login. | Corrigido: a interface avança para cadastro ou uso da chave. O navegador local mostrou a etapa de cadastro. O cadastro/autenticação criptográfica segue sem validação, pois requer toque da chave física pelo proprietário. |
| Alta | WebAuthn configurado para `localhost` não aceita a origem distinta `127.0.0.1`. | Documentado e restringido: usar `http://localhost:5173/admin` no cadastro local; origem de produção exigiria credencial operacional própria. |
| Média | A rota antiga `DELETE /api/account` encerra sessão, mas não excluía a conta. Revogar métricas também não removia os identificadores pseudônimos já registrados. | Corrigido: exclusão com confirmação remove perfil, favoritos, sessões e desafios; a conta administrativa é protegida. Revogação remove visitantes/sessões pseudônimas e expira cookies; contagens agregadas permanecem. |
| Média | Painel não comparava períodos nem apresentava gráficos e mapa operacional com estados desconhecidos. | Implementado: cartões com comparação de períodos, gráficos selecionáveis, atualização quando a aba está visível e mapa interativo. Cada status desconhecido é explícito; PubMed usa métricas agregadas e SBC usa verificações manuais recentes. |
| Média | A instrumentação de uso não cobria filtros, abertura de artigo e cliques em fonte. | Instrumentados eventos consentidos de filtros, ordenação, abertura e fonte. Termos livres não são enviados à telemetria. O painel só estima visitantes que consentiram; não representa todos os usuários ativos. |
| Média | A integração PubMed não tinha limitador global persistido nem configuração para contato do NCBI. | Implementado limitador compartilhado pelo D1, cache de cinco minutos e limite de buscas não cacheadas por origem/IP. Parâmetros de cache são resumidos por hash; o termo não volta na resposta nem é armazenado como chave legível. `NCBI_CONTACT_EMAIL` e `NCBI_API_KEY` permanecem sem configuração real. |
| Média | As chamadas de verificação editorial faziam HEAD externo sem limitar lote ou tratar redirecionamentos de forma segura. | Hosts allowlistados; lote de cinco chamadas; redirecionamentos não seguidos; 404, falha HTTP, redirecionamento e método não suportado são estados distintos. É verificação manual, não monitoramento contínuo. |
| Média | `service_metrics` não contém distribuição de latência, causa de erro ou correlação. | Parcial: média agregada por serviço/dia está disponível; p95, causa, correlation ID, cache hit e disponibilidade do banco/autenticação ainda não são coletados. O painel deixa percentis e serviços não instrumentados como desconhecidos. |
| Média | A lista SBC é estática e parcial; “Registrar revisão editorial” registra somente data, sem versões, fila ou reversão. | Limite documentado. Não declarar cobertura integral do acervo nem fluxo editorial completo. Proveniência e revisão editorial versionada continuam pendentes. |
| Baixa | Documentação dizia que artigos eram traduzidos e instruía só a primeira migração. | Corrigido: PubMed permanece no idioma original; a sequência local agora inclui as migrações 0000, 0001 e 0002. |

## Dados e privacidade observados

| Grupo | Dados | Limites e controles |
|---|---|---|
| Conta | E-mail, perfil profissional/estudantil, preferências, favoritos e sessões. | Acesso da conta própria; sessões de sete dias; exclusão remove dados associados à conta. A conta administrativa não pode ser removida pelo fluxo comum. |
| Métricas | Dia, tipo de evento, tema, fonte, visitantes/sessões pseudônimos e contagens. | Consentimento opt-in; sem termo bruto de busca nem vínculo de evento a conta. Revogação remove pseudônimos; agregados anteriores permanecem. Limpeza de retenção até 180 dias é oportunista, executada ao receber escolha de consentimento; não há agendamento. |
| Rate limit | Hash de ação e IP de origem observado. | IP não é armazenado em claro; linhas expiram em uma hora e são limpas em solicitações subsequentes. Não confiar em cabeçalhos de proxy arbitrários. |
| Operação | Contagens diárias PubMed, duração acumulada, verificações de links e auditoria administrativa. | Sem texto de busca, código OTP, token de sessão ou conteúdo clínico. Cobertura parcial; não há correlação distribuída ou alertas. |

Preferências de e-mail/WhatsApp não ativam envio; notificações não estão implementadas. A descrição é técnica e não declara conformidade com a LGPD. Ainda faltam controlador/responsável, base e finalidade aprovadas, canal do titular, política final e operação de retenção agendada.

## Testes e verificações desta etapa

- `npx tsc --noEmit`: passou após tipar os objetos E-utilities e os eventos do gráfico.
- `npm run build`: passou; o Vinext avisa que algumas rotas dinâmicas aparecem como `Unknown` em classificação estática, sem falhar o build.
- `node scripts/smoke-test.mjs`: passou com 32 asserções de autenticação local, isolamento, favoritos, consentimento e exclusão confirmada.
- Consulta real ao endpoint PubMed local após aplicar a migração 0002: retornou dados oficiais, contagem e artigos; a resposta não inclui o termo pesquisado.
- ESLint focado em `app/api/articles/route.ts` e `app/admin/dashboard-widgets.tsx`: passou. O lint completo ainda falha com 27 erros e 12 avisos em vários módulos, principalmente `no-explicit-any` e regras de hooks. Esse débito não foi integralmente resolvido nesta etapa.
- WebAuthn físico não foi testado; não declarar o administrador operacional até o proprietário cadastrar e usar a chave.

## Pendências priorizadas

1. Validar a cerimônia WebAuthn com a chave física do administrador e o navegador/origem pretendidos.
2. Configurar, pelo proprietário, e-mail de contato do NCBI antes de tráfego público; considerar API key apenas se a escala justificar.
3. Adicionar observabilidade de p95, causas de erro, cache, banco e autenticação sem registrar consultas livres.
4. Implementar retenção agendada, alertas e plano de backup/restauração quando houver infraestrutura escolhida.
5. Criar fila editorial com fonte/proveniência, histórico versionado e reversão para o catálogo SBC.
6. Revisar o catálogo SBC contra o acervo oficial de forma contínua; a seleção local não é completa.
7. Definir política de privacidade final, responsável e canal de solicitações antes de publicar.
