# Português e inglês

A interface pública usa um catálogo em `lib/i18n/en.ts`, com português como texto de origem. Componentes React consomem `useLocale()`; não há tradução automática do DOM.

- O seletor PT/EN mantém a escolha no navegador.
- Links com `?lang=en` ou `?lang=pt` têm prioridade sobre a preferência salva.
- Sem preferência explícita, navegadores em português usam PT; os demais usam EN.
- O idioma do documento, título, descrição e datas acompanham a escolha.
- Títulos, resumos, nomes de sociedades e documentos de origem permanecem no idioma da fonte. Não são traduções clínicas.
- A área administrativa continua em português.
- O cadastro utiliza apenas e-mail e senha. Veja `docs/password-auth.md` para recuperação e acesso administrativo.
- Esta versão usa parâmetros de idioma e hidratação da interface; não cria rotas de SEO por país/idioma nem altera a política existente de indexação.

Verificação: `node --test scripts/i18n-test.mjs`, `pnpm exec tsc --noEmit` e build existente.
