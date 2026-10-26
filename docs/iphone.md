# Preparação para iPhone

O portal continua renderizado no servidor, com as mesmas telas, textos e APIs.

## PWA

`public/manifest.webmanifest` define “Evidências Médicas”, modo standalone e ícones PNG de 192/512 px. O apple-touch-icon tem 180 px. Todos derivam do favicon existente. O layout inclui theme-color e metadados Apple; `other` declara explicitamente `apple-mobile-web-app-capable`, pois esta versão do Vinext emite apenas `mobile-web-app-capable` a partir de `appleWebApp.capable`.

Após publicar em HTTPS, abrir no Safari do iPhone, usar Compartilhar → Adicionar à Tela de Início e abrir pelo ícone. Confirmar nome, ícone, modo standalone e uso normal do portal. Esta validação em iPhone ainda está pendente.

O componente de registro não tem interface e só registra `/sw.js` em produção. `npm run build` executa o postbuild que gera a lista exata dos arquivos de `dist/client/_next/static` e dos ícones públicos. O nome do cache muda conforme o conteúdo. Para builds que chamem Vite diretamente, executar também `node scripts/build-service-worker.mjs` antes de publicar.

O service worker usa cache sob demanda apenas para GET de arquivos dessa lista, na mesma origem, sem query string e com tipo estático. Não intercepta navegações, páginas HTML/RSC, APIs, dados de usuário, resultados do PubMed nem requisições externas. Respostas redirecionadas, privadas, no-store ou com tipo inesperado também não entram no cache. Remove apenas caches antigos com seu próprio prefixo. Atualizações seguem o ciclo normal do navegador, sem forçar recarga ou tomar controle de uma sessão aberta. O portal continua precisando de rede; não há modo offline para consultas ou contas.

## Capacitor e iOS

Capacitor 8 está instalado e o projeto Xcode fica em `ios/App/App.xcodeproj`, com dependências via Swift Package Manager. O ícone nativo de 1024 px também deriva do favicon.

`capacitor.config.ts` documenta cada opção:

- `CAPACITOR_SERVER_URL`: URL HTTPS do portal publicado, lida ao executar o CLI. Não há URL padrão. Credenciais, query e fragmento são recusados.
- `webDir: "capacitor-web"`: bootstrap mínimo e vazio, pois o portal depende do servidor e D1; não é uma exportação estática do site.
- `appId: "com.drpudyn.evidenciasmedicas"`: identificador provisório a confirmar na conta Apple antes da assinatura.
- `appName`: “Evidências Médicas”.

No terminal, definir `CAPACITOR_SERVER_URL` com a URL real de produção e executar:

```sh
npm ci
npm run ios:sync
npm run ios:open
```

Definir a variável no ambiente do processo (por exemplo, `export CAPACITOR_SERVER_URL` no shell após atribuir o valor real). O Capacitor não lê `.env.example`/`.env` automaticamente. `ios:sync` recusa execução sem URL. Apenas gerar/abrir o scaffold sem variável é permitido; ele não carregará o portal até a sincronização com uma URL real. Repetir a sincronização sempre que a URL ou configuração mudar. A URL é incorporada no arquivo nativo gerado; não é resolvida em tempo de execução no iPhone.

Os arquivos gerados `ios/App/App/capacitor.config.json` e `public/`, builds, dados locais e arquivos de usuário do Xcode ficam ignorados. Não colocar tokens, cookies, senhas ou segredos na URL/configuração; o app usa a autenticação normal do portal.

## Verificação

```sh
npm run lint
npx tsc --noEmit
npm run build
node scripts/test-service-worker.mjs
```

Para o smoke test, usar uma base D1 local isolada e aplicar as migrações em ordem (apenas uma vez nessa base):

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to work/smoke-d1 --file drizzle/0000_stiff_sabretooth.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to work/smoke-d1 --file drizzle/0001_fearless_reaper.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to work/smoke-d1 --file drizzle/0002_global_integration_limits.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js dev --config dist/server/wrangler.json --local --persist-to work/smoke-d1 --ip 127.0.0.1 --port 5173 --inspector-port 0 --var LOCAL_PREVIEW_ENABLED:true
```

Em outro terminal, executar `node scripts/smoke-test.mjs`. Não usar `--remote`. A variável de preview acima só habilita o código de acesso demonstrativo em loopback; não deve ser habilitada em produção.

## Para publicar na App Store

Ainda é necessário ter a URL de produção HTTPS, Mac com Xcode compatível com Capacitor 8, conta Apple Developer, identificador definitivo e assinatura/provisionamento. No Mac, sincronizar, compilar e executar em simulador e iPhone; testar login, sessões, favoritos, consultas, links externos, navegação e layout. Depois preparar versão/build, política de privacidade e declarações de dados no App Store Connect, capturas, distribuição/TestFlight e envio para revisão. O scaffold que carrega o site remoto não garante aprovação; a Apple avalia, entre outros critérios, a funcionalidade mínima do aplicativo.

Gerar o projeto com o CLI no Linux não equivale a compilar, assinar ou testar o app nativo. Nenhum binário iOS ou envio à loja faz parte desta etapa.
