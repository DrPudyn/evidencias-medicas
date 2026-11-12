# Busca Evidência

Portal de literatura médica com pergunta clínica, busca no PubMed, catálogo de sociedades, contas, biblioteca pessoal e fichas clínicas revisadas. O nome **Busca Evidência** é provisório e fica em `lib/brand.ts`.

A origem pública sai de `SITE_ORIGIN`. Sem a variável, o padrão é `https://evidencias-medicas.edsoncarvalho9.workers.dev`.

## Pergunta clínica

`POST /api/clinical-question` recebe `{ "question": "..." }` em português (12 a 500 caracteres). O provedor de IA (padrão: binding Workers AI `AI`, modelo em `WORKERS_AI_MODEL`, hoje `@cf/meta/llama-3.3-70b-instruct-fp8-fast`) só gera termos de busca e a síntese. A geração de termos usa temperatura 0 e o código descarta doença cujo termo não está na pergunta, inclusive a sigla DM2 colada ao fármaco. As consultas excluem literatura só animal. Pergunta de indicação sem doença busca a classe sozinha, e também uma consulta só de diretrizes e outra de metanálises, por relevância. Uma diretriz recuperada pode abrir consultas das condições citadas no título ou na conclusão dela. O nome MeSH da classe (por exemplo, Sodium-Glucose Transporter 2 Inhibitors) vale como a sigla do título ou da conclusão. Se não houver resultado, sai primeiro o contexto (atenção primária, saúde da família) e só depois se testa o conceito clínico sozinho. As consultas saem em paralelo. A síntese pede JSON `{itens:[{texto, pmid}]}` e o código monta os `[n]`; se a citação vier inválida, há uma nova tentativa. A busca reutiliza o PubMed e só mantém revisão sistemática, metanálise ou diretriz confirmadas no PublicationType do efetch. A resposta é um texto curto em português, com citações numeradas e links para o PubMed. Afirmações com PMID que não veio da busca são descartadas. Busca vazia ou síntese inválida não é completada com conhecimento geral.

Sem binding `AI` (ou com `CLINICAL_AI_PROVIDER=disabled`) a rota responde 503. `CLINICAL_AI_PROVIDER=fixture` só funciona com `LOCAL_PREVIEW_ENABLED=true` e apenas reorganiza trechos dos registros recuperados.

Limites, no fuso America/Sao_Paulo, gravados no D1 sem o texto da pergunta:

- sem conta: 1 pergunta por dia, chaveada pelo hash do IP
- conta grátis: 3 por dia
- assinante ativo: 40 por dia

Há também um teto horário por IP (45) para conter rajadas. Falha do PubMed devolve a tentativa. Evidência insuficiente conta como pergunta feita.

## Planos e Stripe

A seção Planos mostra a faixa provisória `PLAN_PRICE_LABEL` (padrão `R$ 29–49` /mês). Não é preço em vigor. Checkout, portal e webhook ficam desligados sem as variáveis:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_ID`

O webhook `POST /api/billing/webhook` ativa ou cancela o plano no D1. Nada disso chama a Stripe enquanto as chaves não existirem. Hotmart fica para depois.

## Deploy na Cloudflare

Não publique a partir dos testes. O script recusa sem `CONFIRM_DEPLOY=yes`.

1. `npm run build`
2. `CLOUDFLARE_D1_ID=<id do D1 evidencias-medicas> npm run cf:config`
3. Aplique `drizzle/0005_plans_and_quota.sql` no D1 remoto só quando for a hora, com backup. Este repositório não aplica essa migração em produção.
4. `npx wrangler secret put STRIPE_SECRET_KEY` (e os outros nomes acima, se a cobrança for ligada)
5. `CONFIRM_DEPLOY=yes CLOUDFLARE_D1_ID=<id> npm run deploy:cf`

Bindings: `DB` (D1 `evidencias-medicas`) e `AI` (Workers AI). Vars: `SITE_ORIGIN`, `PLAN_PRICE_LABEL`, `WORKERS_AI_MODEL`, `CLINICAL_AI_PROVIDER=workers-ai`. O modelo versionado fica em `cloudflare/wrangler.template.jsonc` (fora da raiz, para o plugin do Vite não misturar com o binding local). O arquivo que o deploy usa é `dist/server/wrangler.production.json`, gerado depois do build.

## Testar a pergunta clínica

`npm run test:clinical` cobre síntese com PubMed/IA simulados (caso normal, busca vazia, PMID inventado), limites de plano e webhook Stripe com assinatura simulada. Não chama NCBI, Workers AI nem Stripe.

## Funcionalidades atuais

- A pesquisa e os filtros são preservados na sessão da aba (sessionStorage), inclusive após atualizar a página. Não são armazenados artigos, notas, credenciais ou resultados nesse estado. Abrir/fechar detalhes e visitar a biblioteca conserva a pesquisa.
- Compartilhar busca copia um link público com termo, filtros, fonte e página; o destinatário não precisa entrar na conta. O link não inclui notas, dados da conta, tokens ou texto ainda não pesquisado. O termo fica visível no link quando o usuário opta por compartilhar. Sem acesso à área de transferência, um campo permite copiar manualmente.
- Remover um favorito oferece Desfazer por 10 segundos, enquanto a página e a conta permanecem abertas. A restauração preserva pasta, etiquetas, notas e status de leitura.
- Substituições explicitamente registradas em revisão editorial publicada exibem aviso visível com link ao documento substituto; não se infere substituição pelo ano. Rascunhos e revisões retiradas não geram aviso.
- Busca PubMed por texto, especialidade, tema, tipo, período, acesso gratuito e ordenação. A relevância é a do PubMed; não representa avaliação da qualidade da evidência.
- Catálogo versionado de documentos de sociedades, com links à publicação original e proveniência.
- Cadastro direto por e-mail e senha, sem coleta de CRM e sem envio de código. E-mail de membro permanece não verificado. Senhas protegidas por scrypt; sessões em cookies HttpOnly.
- Biblioteca vinculada à conta: favoritos, pasta por leitura, até 12 etiquetas, notas pessoais e status (ler depois, em leitura, lido). Pesquisa por título, etiqueta e nota; filtros por pasta/status.
- Até 30 buscas salvas por conta. Verificação manual compara até 12 resultados da primeira página com a verificação anterior. Resultados diferentes podem decorrer de reordenação ou filtros de período; não equivalem necessariamente a novas publicações. Sem agendamento, e-mail ou push.
- Exportação JSON de biblioteca, notas e buscas pelo próprio usuário. O arquivo baixado contém dados pessoais de leitura; guarde-o com cuidado.
- Administração por senha e sessão administrativa de 15 minutos. Rotas WebAuthn legadas não representam o fluxo atual de entrada.
- Fichas clínicas em português por documento ou PMID, com pergunta, população, intervenção, comparador, resultados, limitações, aplicabilidade e referências/páginas. Publicar exige preencher os campos, identificar o revisor e confirmar leitura integral. O sistema não confirma automaticamente a qualidade da revisão ou a identidade profissional informada.
- Histórico editorial imutável: nova gravação gera versão; rascunhos não substituem publicações. Retirada remove a ficha pública. Carregar versão anterior cria um novo rascunho para revisão. Documentos substitutos podem ser identificados por ID/PMID.
- Fichas publicadas aparecem junto aos artigos/diretrizes. Não há fichas clínicas pré-aprovadas ou conclusões clínicas geradas automaticamente.
- PWA com instruções de instalação e página offline neutra. Contas, notas e buscas não são armazenadas no cache offline.
- Interface pública em português/inglês. Conteúdo editorial permanece no idioma escrito pelo revisor; títulos/resumos PubMed permanecem no original.

## Executar localmente

Requer Node >=22.13.0. Use `npm ci` (ou `npm run install:ci`). Crie `.openai/hosting.json` com `{"d1":"DB","r2":null}`; este arquivo local não é versionado. Copie os exemplos de ambiente apenas se precisar configurar integrações; nunca versione credenciais.

1. `npm run build`
2. Aplique, em ordem, os SQL de `drizzle/0000_*.sql` até `0005_*.sql`, apenas uma vez por banco, usando o Wrangler:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0005_plans_and_quota.sql
```

O comando acima exemplifica a migração de planos. Num banco novo aplique também 0000, 0001, 0002, 0003 e 0004 antes dela. Não execute uma migração já aplicada. 0005 acrescenta assinatura, cota diária da pergunta clínica e eventos do webhook. Não aplique 0005 em produção até o deploy combinado.

3. `npm run preview:local` para servir o Worker compilado em localhost:5173; `npm run dev` para desenvolvimento com recarga.

## Validação

- `npm run lint`
- `npx tsc --noEmit`
- `node --test scripts/i18n-test.mjs scripts/password-test.mjs scripts/pwa-test.mjs scripts/reading-journey-test.mjs`
- `npm run build`
- `node scripts/verify-local.mjs` (banco temporário novo; aplica todas as migrações e executa smoke do Worker, sem credenciais ou rede externa)

Smoke cobre autenticação, recuperação local, isolamento entre contas, biblioteca, notas, buscas, publicação/rascunho/retirada de fichas, auditoria, exclusão e rotas bilíngues. Testes locais não demonstram funcionamento em produção nem entrega real de e-mail.

## Operação sem contratação de serviços

As novas funções usam o D1 e a hospedagem existentes. Nenhum serviço, assinatura ou recurso pago foi contratado. Uso em hospedagem continua sujeito às cotas e condições da infraestrutura existente.

Recuperação de senha por e-mail usa a integração Resend já presente, condicionada a RESEND_API_KEY e EMAIL_FROM. Sem configuração, a API informa indisponibilidade. Na prévia local há links de demonstração. Não há recuperação pública que dispense provar acesso à conta.

Antes de publicar uma versão com estas funções, aplique a migração 0004 no banco correto, preserve uma cópia de segurança e execute o smoke local. A publicação e a migração de produção são ações distintas do build. Nenhuma publicação é feita pelos comandos acima.

Para backup manual gratuito do banco local, com o Worker parado, use `npm run backup:local`; o script copia o estado local completo para uma nova pasta em `.sites-runtime/backups`, sem sobrescrever arquivos anteriores. Pare o Worker antes da cópia: copiar SQLite em uso não produz um backup atômico. Esse backup contém contas e hashes: não publique e não envie ao Git. Exportar biblioteca pelo site não substitui backup do banco.

Confirme a instalação e o layout em aparelhos físicos. E-mail real, disponibilidade pública, política de privacidade com responsável/canal e rotina externa de backup dependem da configuração do proprietário. Documentos PROJETO.md, AUDITORIA.md e CONTEXTO-DO-PROJETO.md são registros históricos; os fluxos atuais estão descritos aqui e no código.

## Clareza da busca, referências e links

O resumo abaixo da pesquisa identifica fonte, especialidade e filtros aplicados. A ajuda recolhida explica os tipos de estudo e a ordenação. Copiar referência usa apenas os metadados disponíveis (sem inventar volume, páginas ou autores); funciona nos detalhes PubMed, nas diretrizes e na organização da biblioteca. Sem acesso à área de transferência, aparece um campo para cópia manual.

O painel verifica links de todas as sociedades em lotes de 10, com até cinco requisições HEAD simultâneas e timeout de seis segundos, somente para URLs HTTPS presentes no catálogo versionado. Redirecionamentos não são seguidos. A fila reúne documentos não encontrados, erros HTTP, redirecionamentos e verificações inconclusivas, com título, sociedade, link e data. É possível interromper novos lotes; o lote já enviado pode terminar no servidor. Nenhuma checagem é disparada automaticamente e não há serviço pago ou migração nova. Testes usam respostas simuladas, sem consultar sites das sociedades.
