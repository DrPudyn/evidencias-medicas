# Catálogo SBC/SBEM

`sbc.json` e `sbem.json` preservam os 49 registros antes embutidos em
`lib/catalog.ts`, inclusive ordem, textos, autoria e URLs. `catalogVersion`
identifica a versão dos dados de cada arquivo (inicial: `1.0.0`).

Cada item tem `provenance`: `source` é o hostname da URL já cadastrada,
`url` é essa URL exata, `society` identifica a coleção SBC/SBEM (a autoria
multissocietária continua em `authorship`) e `guidelineYear` repete o ano
já registrado. Isso documenta a origem legada, sem uma nova revisão médica
ou verificação remota dos links.

O legado não informava datas de acesso: `accessedAt: null` e
`accessStatus: "not-recorded"` registram essa lacuna explicitamente.
Após uma consulta real, registrar a data ISO `YYYY-MM-DD` com estado
`recorded`; não usar a data da migração como data de acesso.

`index.ts` valida os dados com Zod antes de exportá-los. O smoke
`node scripts/catalog-smoke.mjs` valida todos os itens e testa a remoção de
cada campo de proveniência. Ele também integra `scripts/smoke-test.mjs`.
