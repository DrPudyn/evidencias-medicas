import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Executar o mesmo schema usado no carregamento, sem outro runner de TypeScript.
const source = readFileSync(new URL('../data/catalogo/schema.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { catalogSchema } = await import(`data:text/javascript,${encodeURIComponent(outputText.replace('from "zod"', `from ${JSON.stringify(import.meta.resolve('zod'))}`))}`);
for (const society of ['sbc', 'sbem', 'additional']) {
  const data = JSON.parse(readFileSync(new URL(`../data/catalogo/${society}.json`, import.meta.url), 'utf8'));
  catalogSchema.parse(data);
  for (const item of data.items) {
    for (const key of ['source', 'url', 'society', 'guidelineYear', 'accessedAt', 'accessStatus']) {
      const broken = structuredClone(data);
      delete broken.items.find(x => x.id === item.id).provenance[key];
      assert.equal(catalogSchema.safeParse(broken).success, false, `${item.id}: ausência de ${key}`);
    }
    const broken = structuredClone(data);
    delete broken.items.find(x => x.id === item.id).provenance;
    assert.equal(catalogSchema.safeParse(broken).success, false, item.id);
  }
  const broken = structuredClone(data);
  delete broken.catalogVersion;
  assert.equal(catalogSchema.safeParse(broken).success, false);
  console.log(`PASS: catálogo ${society.toUpperCase()}, ${data.items.length} itens; proveniência obrigatória.`);
}

