# Evidências Médicas

Preparação para iPhone (PWA, Capacitor, configuração e verificações): [docs/iphone.md](docs/iphone.md).

Portal para localizar literatura científica e documentos de sociedades médicas, com foco inicial em Cardiologia e Endocrinologia e Metabologia. O site ajuda a encontrar a fonte original e a guardá-la na biblioteca da conta. A ordenação da busca no PubMed segue a data de publicação ou a relevância da consulta; ela não é uma nota automática de qualidade da evidência.

O nome do pacote npm é `evidencias-medicas`.

## O que o código faz

### Busca no PubMed

`GET /api/articles` consulta o PubMed pelas E-utilities da NCBI (`esearch`, `esummary` e `efetch`) em `app/api/articles/route.ts`. A busca aceita especialidade, tema, período (30, 365 ou 1825 dias), tipo de estudo, texto completo gratuito, ordenação e página. Cada página pede 12 registros.

Títulos, resumos e o idioma devolvido pelo PubMed permanecem os do registro original. `lib/catalog.ts` mapeia alguns conceitos em português para termos de consulta. Esse mapeamento só entra na query; o artigo não é traduzido.

O seletor lista as especialidades médicas do CFM. Os catálogos de documentos de sociedade existem para Cardiologia (SBC) e Endocrinologia e Metabologia (SBEM). As outras especialidades consultam o PubMed com temas locais.

`GET /api/articles/[id]` carrega o resumo estruturado do PMID, também no idioma original, e a interface aponta o link do PubMed.

A busca guarda em memória até 100 respostas por cinco minutos. A chave é um hash dos parâmetros enviados à NCBI, e o JSON da busca não devolve o termo digitado. Fora do cache, há no máximo 120 consultas por hora por origem/IP observado: o endereço não fica em claro, o hash expira em uma hora e cabeçalhos de proxy arbitrários não entram nessa chave. As chamadas E-utilities compartilham a tabela `integration_rate_slots`, com intervalo mínimo de 400 ms e fila de até 10 segundos. Falha do PubMed vira resposta de erro, sem detalhe interno.

`NCBI_CONTACT_EMAIL` e `NCBI_API_KEY` só são enviados à NCBI quando estão preenchidos. Nos exemplos do repositório os dois campos estão vazios.

### Catálogos SBC e SBEM

`lib/catalog.ts` traz uma seleção estática:

- 32 documentos da SBC em `brazilianGuidelines`, de 2004 a 2026, com tema, tipo, ano e escopo.
- 17 documentos da SBEM, ou elaborados com participação da sociedade, em `endocrineGuidelines`.
- Três estudos clássicos de cardiologia em `collection` e três de endocrinologia em `endocrinologyCollection`, com link para o registro PubMed.

Os links abrem a publicação original. O repositório não incorpora o texto integral desses documentos. A seleção local não cobre o acervo oficial inteiro. “Registrar revisão editorial” grava a data da revisão; não há fila, versão nem reversão.

### Conta, perfil e favoritos

O cadastro distingue médico (nome, e-mail, CRM e UF) e estudante (nome, e-mail, faculdade e estado). O CRM é aceito como número de 3 a 8 dígitos. Não há consulta ao conselho profissional. Telefone é opcional. As preferências de e-mail e WhatsApp nascem desmarcadas, ficam no perfil e não disparam mensagem.

O login pede um código de seis dígitos, válido por dez minutos, com até cinco tentativas e consumo único. Código e sessão são armazenados como hash. O cookie `em_session` é HttpOnly e SameSite=Lax, com Secure em HTTPS, e dura sete dias.

Perfil, preferências e favoritos de artigos PubMed e de itens do catálogo ficam no D1, separados por usuário. A exclusão confirmada em `DELETE /api/account/delete` remove perfil, favoritos, sessões e desafios. A conta administrativa não segue esse fluxo. `DELETE /api/account` encerra a sessão.

Na prévia local em loopback (`NODE_ENV=development` ou `LOCAL_PREVIEW_ENABLED`), o código aparece na interface como demonstração e nenhum e-mail sai. Isso não prova posse do endereço. Fora dessa prévia, sem `RESEND_API_KEY` e `EMAIL_FROM`, `POST /api/auth/request` responde que o envio ainda não foi ativado.

### Administração

`/admin` pede o código de e-mail e, em seguida, uma chave FIDO2/WebAuthn (`@simplewebauthn`). O painel abre depois da verificação da chave. A sessão administrativa dura quinze minutos.

O cadastro local da primeira chave usa a origem `http://localhost:5173`. WebAuthn trata `127.0.0.1` como outra origem. Uma origem de produção exigiria credencial própria. O toque da chave física do responsável ainda não foi exercitado; a presença das rotas não torna o painel operacional.

### Métricas

O banner em `components/analytics-consent.tsx` é opt-in. Com consentimento, o portal conta eventos de página, busca, filtro, ordenação, abertura, clique na fonte e favorito, por dia, tema e fonte. O termo livre da busca não vai para a telemetria, e o evento não fica ligado à conta.

Recusar o consentimento apaga os identificadores pseudônimos daquele navegador e expira os cookies. Contagens já agregadas permanecem. A limpeza de retenção, de 180 dias, roda quando a API de consentimento recebe uma escolha. Não há tarefa agendada.

O painel administrativo lê essas contagens e as médias diárias de `service_metrics`. Percentis, causa do erro, correlation id, acerto de cache e disponibilidade de banco ou autenticação não são coletados.

## Stack

- TypeScript e React 19.2
- Rotas e componentes no formato do Next.js 16.3, executados pelo Vinext 1.0.0-beta.5 e pelo Vite 8
- Tailwind CSS 4
- Drizzle ORM 0.45 com drizzle-kit, e D1 local pelo Wrangler 4
- WebAuthn administrativo com `@simplewebauthn/browser` e `@simplewebauthn/server`

Node.js `>=22.13.0`, conforme `engines` em `package.json`.

## Como executar

Em um clone novo, o perfil de execução padrão é o portátil: não existe `.sites-runtime/execution-profile.json`.

```sh
npm ci
```

`npm run install:ci` é o instalador travado do repositório. No perfil portátil ele também chama `npm ci`, com as dependências de desenvolvimento e opcionais incluídas.

`vite.config.ts` importa `.openai/hosting.json`. A pasta `.openai/` está no `.gitignore`, então o arquivo não vem no clone. Sem ele, o Vite não carrega a configuração e o build não copia o arquivo para `dist/.openai/hosting.json`. Crie o arquivo só na máquina local. `db/index.ts` espera o binding D1 com o nome `DB`. `vite.config.ts` também lê `r2`; a chave precisa existir para o TypeScript aceitar o JSON importado. Com `null`, nenhum bucket R2 é criado. O portal persiste dados no D1:

```json
{
  "d1": "DB",
  "r2": null
}
```

```sh
npm run dev
```

No perfil portátil, o comando sobe o Vinext com recarga na porta 5173.

```sh
npm run build
npm start
```

`npm run build` gera o Worker, inclusive `dist/server/wrangler.json`. `npm start` serve esse build com Wrangler em `127.0.0.1`, no estado `.wrangler/state`. O comando não publica o site.

```sh
npm run preview:local
```

A prévia compilada também exige o build. Ela escuta em `http://localhost:5173` e encaminha para o Worker local, com `LOCAL_PREVIEW_ENABLED`. No Windows, `iniciar-site.cmd` chama o build se `dist/server/wrangler.json` ainda não existir e em seguida roda esse script. O cadastro WebAuthn local continua em `http://localhost:5173/admin`.

Não há `wrangler.jsonc` na raiz. A prévia compilada usa o `wrangler.json` gerado em `dist/`.

## Migrações D1 locais

Depois do build, aplique cada SQL ainda pendente, nesta ordem e uma vez por banco local:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_stiff_sabretooth.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_fearless_reaper.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0002_global_integration_limits.sql
```

| Arquivo | Conteúdo |
| --- | --- |
| `drizzle/0000_stiff_sabretooth.sql` | Contas, desafios de login, sessões, favoritos e limite de pedidos |
| `drizzle/0001_fearless_reaper.sql` | WebAuthn, auditoria administrativa, métricas, revisões e checagens de link do catálogo |
| `drizzle/0002_global_integration_limits.sql` | Tabela `integration_rate_slots`, usada pelo limitador do PubMed |

`drizzle/meta/_journal.json` lista somente 0000 e 0001. O arquivo 0002 está no repositório e entra na sequência manual acima. `npm run db:generate` gera SQL novo a partir de `db/schema.ts`; não aplica o banco local. O diretório de estado é `.wrangler/state`. A publicação, se existir, aplica as migrações de produção à parte.

## Variáveis de ambiente

Os nomes e os valores de exemplo estão em `.dev.vars.example` e `.env.example`. Copie para `.dev.vars` e `.env`. Os dois destinos estão no `.gitignore`. Não coloque segredo no Git.

| Variável | Arquivo de exemplo | Uso |
| --- | --- | --- |
| `ADMIN_EMAILS` | `.dev.vars.example` | E-mails que podem iniciar a administração. `lib/admin.ts` ainda compara com o endereço fixo desse módulo. |
| `ADMIN_BOOTSTRAP_ENABLED` | `.dev.vars.example` | Primeiro cadastro da chave, restrito a localhost na prévia local. |
| `ADMIN_RP_ID` | `.dev.vars.example` | RP ID do WebAuthn. O exemplo traz `localhost`. |
| `ADMIN_ORIGIN` | `.dev.vars.example` | Origem do WebAuthn. O exemplo traz `http://localhost:5173`. |
| `NCBI_CONTACT_EMAIL` | `.dev.vars.example` | Contato opcional enviado à NCBI. Vazio no exemplo. |
| `NCBI_API_KEY` | `.dev.vars.example` | Chave opcional da NCBI. Vazia no exemplo. |
| `RESEND_API_KEY` | `.env.example` | Envio do código pelo Resend. |
| `EMAIL_FROM` | `.env.example` | Remetente do código. |

`scripts/preview-local.mjs` lê `.dev.vars` e coloca na linha de comando só `ADMIN_EMAILS`, `ADMIN_BOOTSTRAP_ENABLED` e `NCBI_CONTACT_EMAIL`. `NCBI_API_KEY`, `RESEND_API_KEY` e `EMAIL_FROM` ficam de fora dessa linha. `LOCAL_PREVIEW_ENABLED` é ligada pelo próprio script da prévia compilada.

## Estrutura

```
app/                  portal (page.tsx, cardio-app.tsx), /admin e app/api
lib/catalog.ts        especialidades, temas, catálogos e mapeamentos de busca
lib/server.ts         sessão, perfil e variáveis do Worker
lib/admin.ts          administração e WebAuthn
db/schema.ts          esquema Drizzle do portal: contas, sessões, favoritos, admin, métricas e limite de integração
db/index.ts           cliente Drizzle no binding D1 `DB`
drizzle/              SQL 0000, 0001 e 0002
components/           consentimento de métricas e primitivos de interface
scripts/              instalação, dev, build, prévia e scripts/smoke-test.mjs
```

`PROJETO.md`, `AUDITORIA.md` e `CONTEXTO-DO-PROJETO.md` registram etapas anteriores. `CONTEXTO-DO-PROJETO.md` (25/10/2026) avisa que parte de `PROJETO.md` ainda descreve fases locais antigas. Quando um número ou um fluxo divergir, vale o código.

## Estado conhecido

O código contém a busca PubMed, os catálogos SBC/SBEM, o login por código, perfil, favoritos, `/admin` com WebAuthn e as métricas com consentimento.

`AUDITORIA.md` e `PROJETO.md`, com revisão datada de 17/10/2026, registram o que foi executado naquela etapa:

- `npx tsc --noEmit` e `npm run build` passaram. O build pode avisar que rotas dinâmicas ficam como `Unknown` na classificação estática, sem falhar.
- `node scripts/smoke-test.mjs` passou com 32 asserções de autenticação local, isolamento entre contas, favoritos, consentimento e exclusão confirmada.
- Uma consulta ao endpoint local do PubMed, depois da migração 0002, devolveu registros oficiais, e a resposta não incluía o termo pesquisado.
- O ESLint focado em `app/api/articles/route.ts` e `app/admin/dashboard-widgets.tsx` passou. O `npm run lint` do repositório inteiro, nessa data, ainda falhava com 27 erros e 12 avisos, em especial `no-explicit-any` e regras de hooks.

O que segue pendente de validação operacional:

- Cerimônia WebAuthn com a chave física e o navegador/origem pretendidos.
- E-mail de contato da NCBI antes de tráfego público. A API key só entra se a escala justificar.
- Entrega real de e-mail, com remetente verificado. Sem as credenciais, a rota de código fora da prévia local responde que o envio não foi ativado.
- Publicação. O histórico citado em `CONTEXTO-DO-PROJETO.md` menciona uma publicação anterior pelo Sites; a disponibilidade dessa URL não foi reconfirmada em 25/10/2026. A cópia no GitHub não publica o site e não configura e-mail, banco de produção nem autenticação.
- Política de privacidade, responsável e canal do titular. A descrição técnica não afirma conformidade com a LGPD.
- Acervo completo da SBC, proveniência versionada e observabilidade além da média diária.
- Alertas de conteúdo. As preferências de e-mail e WhatsApp são gravadas; o envio não está implementado.

Compilar, passar no smoke test local e operar em produção são verificações diferentes. Nesta atualização de documentação, em 26/10/2026, `npx tsc --noEmit` e `npm run build` passaram de novo. O build repetiu o aviso de rotas `Unknown` na classificação estática. `node scripts/smoke-test.mjs` não foi executado outra vez.

## Scripts

- `npm run dev` — desenvolvimento
- `npm run build` — build do Worker
- `npm start` — prévia do build com Wrangler
- `npm run preview:local` — prévia compilada em `localhost:5173`
- `npm run db:generate` — gera migração Drizzle depois de alterar `db/schema.ts`
- `npm run lint` — ESLint

## Referências

- [PubMed](https://pubmed.ncbi.nlm.nih.gov/)
- [E-utilities](https://www.ncbi.nlm.nih.gov/books/NBK25499/)
- [Vinext](https://github.com/cloudflare/vinext)
- [Drizzle com D1](https://orm.drizzle.team/docs/get-started/d1-new)
