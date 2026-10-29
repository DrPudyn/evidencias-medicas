# Login e cadastro por e-mail e senha

Aplique a migração `drizzle/0003_password_auth.sql` antes de servir esta versão. Ela adiciona hashes e tokens de recuperação, e encerra as sessões/códigos antigos. Contas e favoritos existentes são preservados. O cadastro não coleta os campos profissionais anteriores; dados antigos não são apagados por esta migração.

O cadastro público recebe somente e-mail e senha (12 a 128 caracteres). Senhas usam scrypt N=32768, r=8, p=3, salt aleatório individual e comparação de tempo constante. O servidor ignora campos adicionais e nunca aceita função administrativa enviada pelo cliente.

O único e-mail administrativo é `evidenciasmedicas@outlook.com`. Ele é reservado: não pode ser registrado pela API pública. Para definir a primeira senha ou migrar a conta antiga, use “Esqueci ou ainda não tenho senha”. O link enviado à caixa administrativa comprova o controle do endereço. Não existe senha padrão ou senha em código-fonte.

A recuperação em produção depende de `RESEND_API_KEY` e `EMAIL_FROM` existentes. O login e o cadastro comuns não dependem do serviço de e-mail. Tokens aleatórios duram 30 minutos, são armazenados como hash, têm uso único e invalidam sessões anteriores. A prévia local pode mostrar um link de teste somente com a configuração de desenvolvimento já existente; nunca ative `LOCAL_PREVIEW_ENABLED` em produção.

O painel agora aceita o mesmo e-mail e senha e recebe uma sessão administrativa separada de 15 minutos, vinculada à sessão principal. Não exige a chave física no fluxo de acesso. As tabelas e rotas legadas de WebAuthn permanecem para compatibilidade, protegidas pela identidade administrativa; os endpoints de login por código respondem 410.

Verificações: TypeScript, build e `node scripts/smoke-ci.mjs` após aplicar todas as migrações no banco local do CI.
