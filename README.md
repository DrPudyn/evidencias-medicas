# Evidências Médicas

Portal de literatura médica com busca no PubMed, catálogo de sociedades, contas, biblioteca pessoal e fichas clínicas revisadas.

## Funcionalidades atuais

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
2. Aplique, em ordem, os SQL de `drizzle/0000_*.sql` até `0004_*.sql`, apenas uma vez por banco, usando o Wrangler:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0004_reading_workspace.sql
```

O comando acima exemplifica a nova migração. Num banco novo aplique também 0000, 0001, 0002 e 0003 antes dela. Não execute uma migração já aplicada. 0004 preserva favoritos e acrescenta organização de leitura, buscas salvas e versões editoriais.

3. `npm run preview:local` para servir o Worker compilado em localhost:5173; `npm run dev` para desenvolvimento com recarga.

## Validação

- `npm run lint`
- `npx tsc --noEmit`
- `node --test scripts/i18n-test.mjs scripts/password-test.mjs scripts/pwa-test.mjs`
- `npm run build`
- `node scripts/verify-local.mjs` (banco temporário novo; aplica todas as migrações e executa smoke do Worker, sem credenciais ou rede externa)

Smoke cobre autenticação, recuperação local, isolamento entre contas, biblioteca, notas, buscas, publicação/rascunho/retirada de fichas, auditoria, exclusão e rotas bilíngues. Testes locais não demonstram funcionamento em produção nem entrega real de e-mail.

## Operação sem contratação de serviços

As novas funções usam o D1 e a hospedagem existentes. Nenhum serviço, assinatura ou recurso pago foi contratado. Uso em hospedagem continua sujeito às cotas e condições da infraestrutura existente.

Recuperação de senha por e-mail usa a integração Resend já presente, condicionada a RESEND_API_KEY e EMAIL_FROM. Sem configuração, a API informa indisponibilidade. Na prévia local há links de demonstração. Não há recuperação pública que dispense provar acesso à conta.

Antes de publicar uma versão com estas funções, aplique a migração 0004 no banco correto, preserve uma cópia de segurança e execute o smoke local. A publicação e a migração de produção são ações distintas do build. Nenhuma publicação é feita pelos comandos acima.

Para backup manual gratuito do banco local, com o Worker parado, use `npm run backup:local`; o script copia o estado local completo para uma nova pasta em `.sites-runtime/backups`, sem sobrescrever arquivos anteriores. Pare o Worker antes da cópia: copiar SQLite em uso não produz um backup atômico. Esse backup contém contas e hashes: não publique e não envie ao Git. Exportar biblioteca pelo site não substitui backup do banco.

Confirme a instalação e o layout em aparelhos físicos. E-mail real, disponibilidade pública, política de privacidade com responsável/canal e rotina externa de backup dependem da configuração do proprietário. Documentos PROJETO.md, AUDITORIA.md e CONTEXTO-DO-PROJETO.md são registros históricos; os fluxos atuais estão descritos aqui e no código.
