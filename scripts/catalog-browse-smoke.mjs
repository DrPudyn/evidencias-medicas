import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
const bundle = await build({ stdin: {
  contents: 'export * from "./components/cardio/catalog-query"; export * from "./data/catalogo"; export * from "./data/catalogo/societies"; export { medicalSpecialties } from "./lib/catalog";',
  resolveDir: root, loader: 'ts',
}, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': root } });
const { browseModel, guidelineToArticle, canonicalGuideline, allGuidelines, societies, medicalSpecialties, societyForSpecialty } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const base = { specialty: '', tab: 'sbc', query: '', topic: 'all', type: 'all', period: 'all', guidelineYear: 'all', free: false, sort: 'recent', articles: [], saved: [] };
const ids = new Set();
for (const item of allGuidelines) {
  assert.ok(!ids.has(item.id), `ID repetido: ${item.id}`); ids.add(item.id);
  assert.equal(canonicalGuideline(item.id, item.provenance.society), item);
  assert.equal(canonicalGuideline(item.id, 'forged-society'), undefined);
}
let covered = 0;
for (const [specialty] of medicalSpecialties) {
  const society = societyForSpecialty(specialty);
  assert.ok(society, specialty);
  const model = browseModel({ ...base, specialty });
  assert.ok(model.hasBrazilianCatalog);
  assert.equal(model.societyLabel, society.abbreviation);
  if (model.activeGuidelines.length) covered++;
  for (const item of model.sbcMatches) {
    assert.ok((item.societyIds || [item.provenance.society]).includes(society.id), `${specialty}: documento de outra sociedade`);
    for (const topic of item.topics || [item.topic]) assert.ok(model.sbcVisibleTopics.some(([key]) => key === topic), `${item.id}: tema inacessível`);
    const article = guidelineToArticle(item, society.id);
    assert.equal(article.url, item.url); assert.equal(article.source, item.provenance.society);
    const year = browseModel({ ...base, specialty, guidelineYear: String(item.year) });
    assert.ok(year.sbcMatches.every(doc => doc.year === item.year));
    const kind = browseModel({ ...base, specialty, type: item.kind });
    assert.ok(kind.sbcMatches.every(doc => doc.kind === item.kind));
  }
}
assert.equal(browseModel(base).activeGuidelines.length, 0);
assert.equal(browseModel({ ...base, specialty: 'unknown' }).hasBrazilianCatalog, false);
assert.notEqual(societyForSpecialty('pediatrics').id, societyForSpecialty('pathology').id);
assert.notEqual(societyForSpecialty('nephrology').id, societyForSpecialty('neurosurgery').id);
assert.equal(societyForSpecialty('angiology').id, societyForSpecialty('vascular-surgery').id);
const derma = browseModel({ ...base, specialty: 'dermatology', query: 'PSORÍASE' });
assert.ok(derma.sbcMatches.length > 0, 'busca em português com acento pelos temas');
assert.equal(browseModel({ ...base, specialty: 'dermatology', query: 'termo-inexistente-xyz' }).sbcMatches.length, 0);
console.log(`PASS: ${medicalSpecialties.length} especialidades, ${societies.length} sociedades, ${allGuidelines.length} documentos, ${covered} especialidades com documentos. Filtros, busca, autoria, biblioteca e siglas homônimas conferidos.`);
