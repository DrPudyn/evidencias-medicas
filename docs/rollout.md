# Publicação bilíngue e confirmação de e-mail

Rotas públicas: `/pt` e `/en`, com conteúdo renderizado no servidor, idioma do documento, metadados, canonical/hreflang, sitemap e robots. Links com tokens e o painel administrativo recebem noindex.

Cadastro direto por e-mail e senha: cria conta e sessão imediatamente, sem confirmação ou envio de e-mail. O endereço de membros permanece não verificado no banco. Contas antigas sem senha usam a recuperação. Links de confirmação antigos continuam compatíveis, sem substituir contas já existentes.

O painel oferece a opção explícita de primeiro acesso. O link administrativo chega apenas a `evidenciasmedicas@outlook.com`, e retorna ao painel depois de definir a senha e entrar.

## Pendência operacional adiada pelo proprietário

O envio real ainda depende de configurar `RESEND_API_KEY` e `EMAIL_FROM` nos secrets de Sites, com domínio remetente próprio verificado. Não há plano pago contratado, conta de envio criada nem credenciais em código. Até essa configuração, as APIs informam que o envio está indisponível; não alegam que uma mensagem foi enviada. O site continua disponível para pesquisa e consulta.

## Banco e validação

A nova migração 0003 é somente de esquema e ainda não havia sido publicada. Adiciona hashes, verificação, tokens e o tipo de autenticação da sessão. Sessões antigas sem `auth_method=password` deixam de ser aceitas. Contas e favoritos existentes são preservados. Metadados Drizzle foram gerados com o esquema correspondente à migração 0002 já existente e com o novo esquema da 0003.

Build, TypeScript, seis testes unitários e smoke com Worker compilado/D1 local passaram. O smoke cobre confirmação/replay, login, biblioteca, logout, recuperação/revogação, reserva administrativa e conteúdo/metadados SSR dos dois idiomas. Os testes locais usam links de demonstração; não comprovam entrega em uma caixa de e-mail real.
