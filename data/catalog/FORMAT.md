# Catálogo SBC/SBEM

`sbc.json` e `sbem.json` preservam a ordem e todos os campos dos documentos anteriormente definidos em `lib/catalog.ts`. `lib/catalog-data.ts` valida os arquivos com Zod ao importar; `lib/catalog.ts` mantém os exports e remove apenas os metadados antes de entregar os objetos existentes à interface.

Cada item inclui `provenance`:

- `society`: coleção de origem (`SBC` ou `SBEM`); não substitui a autoria multissocietária registrada em `authorship`.
- `originalUrl`: cópia exata de `url`, inclusive links de acervo já existentes.
- `publishedDate`: ano (`AAAA`) quando essa é a única precisão disponível, ou data completa (`AAAA-MM-DD`) quando documentada. A migração preserva somente o ano conhecido.
- `lastReviewedAt`: data da última revisão documental (`AAAA-MM-DD`), ou `null` quando desconhecida. A extração técnica não representa revisão médica ou verificação das fontes.
- `catalogVersion`: versão semântica da coleção, inicialmente `1.0.0`, repetida em cada item.

Ao atualizar uma coleção, mantenha sua versão consistente em todos os itens. Não preencha datas desconhecidas por aproximação. O schema rejeita campos desconhecidos, IDs duplicados, datas inválidas, divergência entre ano/data ou URL original, e versões/sociedades inconsistentes.

Validação de regressão: `node --experimental-strip-types --test scripts/catalog.test.mjs`. Os hashes registram os objetos originais, inclusive ordem e conteúdo textual; alterações editoriais futuras exigem revisão explícita dessa referência.
