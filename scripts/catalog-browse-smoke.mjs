import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.resolve('vite'));
const { build } = require('esbuild');
const bundle = await build({ stdin: {
  contents: 'export * from "./components/cardio/catalog-query"; export * from "./data/catalogo"; export * from "./data/catalogo/societies"; export { medicalSpecialties } from "./lib/catalog"; export { ResultsPanel } from "./components/cardio/results-panel";',
  resolveDir: root, loader: 'ts',
}, bundle: true, write: false, format: 'esm', platform: 'node', alias: { '@': root }, external: ['react', 'react/jsx-runtime', 'lucide-react'] });
const testDirectory = path.join(root, '.sites-runtime/catalog-test');
mkdirSync(testDirectory, { recursive: true });
const testModule = path.join(testDirectory, 'bundle.mjs');
writeFileSync(testModule, bundle.outputFiles[0].text);
const { browseModel, guidelineToArticle, canonicalGuideline, allGuidelines, societies, medicalSpecialties, societyForSpecialty, ResultsPanel } = await import(pathToFileURL(testModule).href);
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
  assert.equal(model.hasBrazilianCatalog, model.activeGuidelines.length > 0);
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
const noop = () => {};
function renderSpecialty(specialty) {
  const browse = { ...base, specialty, q: '', loading: false, error: '', count: 0, page: 1, search: noop };
  return renderToStaticMarkup(createElement(ResultsPanel, { browse, model: browseModel(browse), saved: [], saving: '', onChooseTab: noop, onOpenArticle: noop, onToggleSaved: noop, onShowInitialCollection: noop, onClearResults: noop }));
}
const psychiatry = renderSpecialty('psychiatry');
assert.match(psychiatry, /Diretrizes ABP/);
assert.match(psychiatry, /Associação Brasileira de Psiquiatria/);
assert.match(psychiatry, /social anxiety disorder/);
assert.doesNotMatch(psychiatry, /Diretrizes SBC/);
assert.match(renderSpecialty('cardiology'), /Diretrizes SBC/);
assert.doesNotMatch(renderSpecialty('homeopathy'), /Diretrizes AMHB/);
console.log(`PASS: ${medicalSpecialties.length} especialidades, ${societies.length} sociedades, ${allGuidelines.length} documentos, ${covered} especialidades com documentos. Filtros, busca, autoria, biblioteca e siglas homônimas conferidos.`);
