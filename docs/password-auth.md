# Login e cadastro por e-mail e senha

Aplique a migração `drizzle/0003_password_auth.sql` antes de servir esta versão. Ela adiciona hashes e tokens de recuperação, sem apagar sessões/códigos antigos, que mantêm a expiração original. Contas e favoritos existentes são preservados. O cadastro não coleta os campos profissionais anteriores; dados antigos não são apagados por esta migração.

O cadastro público recebe somente e-mail e senha (12 a 128 caracteres). Senhas usam scrypt N=32768, r=8, p=3, salt aleatório individual e comparação de tempo constante. O servidor ignora campos adicionais e nunca aceita função administrativa enviada pelo cliente.

O único e-mail administrativo é `evidenciasmedicas@outlook.com`. Ele é reservado contra cadastro comum. Para definir a primeira senha administrativa ou de uma conta antiga sem hash, use “Primeiro acesso” e crie a senha diretamente, sem e-mail. A configuração depende da proteção existente do Cloudflare Access em todo o site, inclusive nas rotas de API. Apenas o endereço administrativo pode ser criado por esse fluxo; outras contas devem existir. A gravação condicional impede substituir uma senha já definida, inclusive em requisições concorrentes. Não existe senha padrão ou senha em código-fonte.

A recuperação em produção depende de `RESEND_API_KEY` e `EMAIL_FROM` existentes; se qualquer um estiver ausente, a tela informa que a recuperação não está configurada e orienta contatar o administrador ou usar Primeiro acesso se ainda não houver senha. O login e o cadastro comuns não dependem do serviço de e-mail. Tokens aleatórios duram 30 minutos, são armazenados como hash, têm uso único e invalidam sessões anteriores. A prévia local pode mostrar um link de teste somente com a configuração de desenvolvimento já existente; nunca ative `LOCAL_PREVIEW_ENABLED` em produção.

O painel agora aceita o mesmo e-mail e senha e recebe uma sessão administrativa separada de 15 minutos, vinculada à sessão principal. Não exige a chave física no fluxo de acesso. As tabelas e rotas legadas de WebAuthn permanecem para compatibilidade, protegidas pela identidade administrativa; os endpoints de login por código respondem 410.

Verificações: TypeScript, build e `node scripts/smoke-ci.mjs` após aplicar todas as migrações no banco local do CI.
