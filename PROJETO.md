# Evidências Médicas — Cardiologia e Endocrinologia

Primeira versão local, criada com o starter Vinext do Sites. Sem domínio, publicação ou cobrança.

## Implementado

- Página inicial responsiva, guia de busca e descrição dos recursos.
- Consulta real ao PubMed (E-utilities) com palavra-chave, tema, período, tipo de estudo, acesso gratuito, ordenação e paginação.
- Busca da página inicial aceita vários termos; mapeia conceitos cardiovasculares em português para termos de consulta em inglês e exige todos no título (`[Title]`, combinados com AND). Os títulos e resumos dos artigos permanecem no idioma original.
- Ficha do artigo com resumo estruturado carregado diretamente do PubMed, indicação da fonte e link para a referência original.
- Busca organizada por especialidade (Cardiologia ou Endocrinologia e Metabologia), com tópicos clínicos alinhados às áreas da SBC/SBEM; fontes em abas próprias para artigos PubMed e documentos SBC/SBEM.
- Aba SBC com 32 documentos catalogados (2004–2026), busca combinada e filtros por tema, tipo e ano. Os temas da SBC exibem a contagem dinâmica de documentos cadastrados; temas sem documento associado não aparecem nessa aba. O PubMed mantém todos os temas sem contagens extras.
- A cobertura local da SBC é uma seleção, não o acervo completo. Documentos históricos e escopos parciais são identificados; quando os filtros não encontram um item, a interface esclarece que isso não significa ausência de conteúdo no acervo completo.
- Coleção inicial de três referências reais, separada da consulta de publicações recentes. Metadados conferidos nos links do PubMed presentes no código.
- Cadastro de médico (nome, e-mail, CRM e UF) ou estudante (nome, e-mail, faculdade e estado).
- Telefone opcional; consentimentos separados, desmarcados por padrão, para e-mail e WhatsApp.
- Login por código de seis dígitos, expiração de dez minutos, cinco tentativas, limite de reenvio e consumo único. Códigos e sessões são armazenados como hashes.
- Cookie de sessão HttpOnly/SameSite, Secure em HTTPS, validade de sete dias; proteção de origem nas mutações.
- Perfil, preferências e favoritos de artigos PubMed e diretrizes SBC persistidos no D1 local, separados por usuário e protegidos no servidor.

## Prévia local

Abra `iniciar-site.cmd` para iniciar a prévia em `http://127.0.0.1:5173`. Alternativamente, use `npm run dev` a partir desta pasta. Se o shim de npm do Windows falhar, use o caminho absoluto do `npm-cli.js` da instalação de Node para executar os scripts. Mantenha a janela do servidor aberta durante o uso.

O banco local depende das migrações `drizzle/0000_stiff_sabretooth.sql`, `drizzle/0001_fearless_reaper.sql` e `drizzle/0002_global_integration_limits.sql`, aplicadas nessa ordem e uma única vez por banco. O build gera `dist/server/wrangler.json`. Exemplo para a migração mais recente (repita para cada arquivo ainda não aplicado):

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_global_integration_limits.sql
```

Durante desenvolvimento em localhost/127.0.0.1, o código aparece explicitamente como demonstração na interface e nenhum e-mail é enviado. Isso NÃO comprova titularidade do endereço. O código de prévia só é permitido com NODE_ENV=development e host loopback; produção falha fechada se o serviço de e-mail não estiver configurado. Use dados fictícios nesta fase.

## Dependências antes de publicar

1. Configurar remetente verificado e `RESEND_API_KEY`/`EMAIL_FROM` como segredos no servidor. A integração HTTP de envio já está implementada, mas requer credenciais e teste real de entrega. Não comitar segredos.
2. Definir provedor e implementação de notificações de conteúdo. A versão atual registra preferências, mas ainda não envia alertas por e-mail nem WhatsApp. A interface informa isso.
3. Finalizar política de privacidade, responsável e canal de atendimento. O texto atual descreve apenas a prévia local.
4. Revisar autenticação antes do hosting: o Sites oferece identidade ChatGPT por padrão; esta versão local implementa o fluxo de e-mail solicitado. Confirmar a compatibilidade e a política de acesso do ambiente escolhido antes de publicar.
5. Escolher domínio e condições de lançamento com o proprietário. Não há Site registrado nem publicação automática neste projeto local.

Não há validação de CRM no conselho profissional. A coleção não inclui recomendações de tratamento geradas. Títulos e resumos do PubMed permanecem no idioma da publicação; o site informa o idioma quando o PubMed o fornece. A busca traduz alguns conceitos cardiovasculares comuns por um mapeamento local; consultas livres mais complexas funcionam melhor em inglês. Não há tradução automática dos artigos.

## Administração e segurança local

- A administração usa código de e-mail e uma chave FIDO2/WebAuthn com toque; o painel só abre depois da verificação da chave. No localhost, o código é demonstrativo e não comprova posse do e-mail.
- Para cadastrar a primeira chave, use `http://localhost:5173/admin`. WebAuthn está configurado para a origem `localhost`; o endereço `127.0.0.1` não compartilha essa origem.
- A chave fica vinculada ao navegador/origem usado no cadastro. Localhost e um futuro domínio de produção são origens distintas e exigiriam um novo cadastro operacional.
- O código demonstrativo depende do modo `development` e de uma origem loopback; a rota de produção exige a configuração do serviço de e-mail e não retorna código na resposta.
- Sessões comuns duram sete dias; sessões administrativas duram quinze minutos. O endpoint legado `DELETE /api/account` encerra a sessão. A exclusão da conta fica em `DELETE /api/account/delete`, exige confirmação e remove perfil, favoritos, sessões e desafios; a conta administrativa protegida não pode ser excluída por esse fluxo.

## Coleta e limites de privacidade

- Dados de conta ficam em `users`, `sessions` e `bookmarks`; preferências de comunicação são campos do perfil e não ativam envios nesta versão.
- Métricas de uso exigem consentimento opcional. São contagens por dia, evento, tema e fonte; termos de busca e associação a contas não são armazenados. Cookies pseudônimos permitem estimar visitantes e sessões e têm retenção declarada de até 180 dias.
- Revogar métricas apaga os identificadores pseudônimos e as sessões de análise. Contagens já agregadas permanecem, pois não guardam vínculo que permita subtrair com segurança a contribuição individual.
- A limpeza de retenção é oportunista, executada quando a API de consentimento recebe tráfego; não há tarefa agendada nesta infraestrutura local. Portanto, 180 dias é a regra de expiração aplicada na próxima execução de limpeza, não uma garantia de exclusão na hora exata.
- Exclusão da conta não apaga contagens anônimas já agregadas. Não declarar conformidade legal com a LGPD sem definir controlador, finalidade jurídica, canal do titular, política final e operação de retenção.
- A limitação por endereço IP é usada apenas para rate limit e os endereços não são guardados em claro: a chave é um hash e expira em até uma hora. Os cabeçalhos de IP de proxy não confiável não são usados.

## Limites da integração PubMed

- Cada busca sem cache permite até 120 consultas por hora por origem/IP observado. O cache dura cinco minutos por instância, mantém até cem resultados e usa hash dos parâmetros; o termo livre não é devolvido nem persistido como chave legível.
- As chamadas E-utilities compartilham slots persistidos no D1 local, com intervalo mínimo aproximado de 350 ms (limite conservador de menos de três chamadas por segundo) e fila máxima aproximada de dez segundos. Falha no PubMed ou no banco produz resposta de serviço indisponível, sem expor erro interno.
- `NCBI_CONTACT_EMAIL` e `NCBI_API_KEY` são configurações opcionais e estão vazias no exemplo. Antes de uso público, configurar um e-mail de contato operacional do projeto; a chave só é necessária se a escala justificar. Nenhuma conta ou serviço externo foi configurado nesta etapa.

## Verificação desta versão

- TypeScript (`npx tsc --noEmit`) e build de produção concluídos depois das mudanças desta etapa.
- `scripts/smoke-test.mjs` passou com 32 asserções: cadastro fictício, código incorreto e consumo único, cooldown, sessão, isolamento entre contas, favoritos, preferências, guarda de rotas, recusa de métricas, origem e exclusão confirmada.
- Uma busca real ao endpoint local do PubMed retornou resultados e metadados depois da migração 0002; o JSON não devolve o texto da busca.
- ESLint focado na rota PubMed e nos gráficos administrativos passou. O lint completo permanece pendente: 27 erros e 12 avisos em vários módulos, sobretudo tipos `any` explícitos e uma regra de hooks.
- Não foi concluído cadastro nem autenticação WebAuthn: falta o toque da chave física do proprietário. O painel protegido não deve ser considerado pronto para uso administrativo até essa etapa manual.
- Cadastro de médico, persistência após recarregar e biblioteca verificados no navegador.
- Cadastro de estudante e filtros inspecionados em viewport móvel de 390 px; layout de computador verificado em 1440 px, sem transbordamento horizontal.
- Consulta PubMed com insuficiência cardíaca, ensaio clínico, últimos 12 meses e texto gratuito retornou resultados reais.
- Capturas em `preview/desktop.jpg` e `preview/mobile.jpg`.
- A versão compilada, executada localmente em modo de produção, retornou 503 sem credenciais de e-mail e não expôs código de demonstração.

## Referências

- PubMed: https://pubmed.ncbi.nlm.nih.gov/
- E-utilities: https://www.ncbi.nlm.nih.gov/books/NBK25499/
- Resend: https://resend.com/docs/api-reference/emails/send-email
- Referências da coleção: PMIDs 37952131, 34449189, 26551272.

Cache de busca: cinco minutos por instância, até cem consultas. A limitação global PubMed é serializada pelo D1, mas ainda precisa ser observada em infraestrutura distribuída real. O uso do e-mail de contato do NCBI ainda requer configuração pelo proprietário antes da publicação.
