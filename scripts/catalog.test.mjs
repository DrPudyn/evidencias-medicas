import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { catalogSchema } from '../lib/catalog-schema.ts';

const catalogs = ['sbc', 'sbem'].map((name) => JSON.parse(readFileSync(new URL(`../data/catalog/${name}.json`, import.meta.url), 'utf8')));
const baselines = [
  { count: 32, sha256: '272b30c7ac2471b0282fabb854418638bb6040039c00105ba932739bea7f806c' },
  { count: 17, sha256: 'eadd109aabcbca91048deb2f4f900647eccd55fe02cdeae4e1a0dd17b1293197' },
];

test('both catalogs preserve every legacy field, its value and document order', () => {
  for (const [index, data] of catalogs.entries()) {
    const parsed = catalogSchema.parse(data);
    assert.equal(parsed.length, baselines[index].count);
    // Preserve legacy key ordering when hashing; Zod can reorder object keys.
    const legacy = data.map(({ provenance, ...item }) => { assert.ok(provenance); return item; });
    assert.equal(createHash('sha256').update(JSON.stringify(legacy)).digest('hex'), baselines[index].sha256);
    assert.deepEqual(parsed.map(({ provenance, ...item }) => { assert.ok(provenance); return item; }), legacy);
    assert.ok(parsed.every((item) => item.provenance.lastReviewedAt === null));
  }
});

for (const [label, mutate] of [
  ['missing provenance', (data) => { delete data[0].provenance; }],
  ['unknown fields', (data) => { data[0].unexpected = true; }],
  ['invalid society', (data) => { data[0].provenance.society = 'OTHER'; }],
  ['invalid URL', (data) => { data[0].url = 'javascript:alert(1)'; }],
  ['mismatched original URL', (data) => { data[0].provenance.originalUrl = 'https://example.org/'; }],
  ['invented date precision / invalid date', (data) => { data[0].provenance.publishedDate = '2026-02-30'; }],
  ['mismatched publication year', (data) => { data[0].provenance.publishedDate = '1900'; }],
  ['invalid review date', (data) => { data[0].provenance.lastReviewedAt = '2026-02-30'; }],
  ['invalid version', (data) => { data[0].provenance.catalogVersion = 'latest'; }],
  ['mixed versions', (data) => { data[0].provenance.catalogVersion = '2.0.0'; }],
  ['mixed societies', (data) => { data[0].provenance.society = 'SBEM'; }],
  ['duplicate IDs', (data) => { data[1].id = data[0].id; }],
]) {
  test(`rejects ${label}`, () => {
    const data = structuredClone(catalogs[0]);
    mutate(data);
    assert.equal(catalogSchema.safeParse(data).success, false);
  });
}

test('accepts documented full publication/review dates and rejects an empty catalog', () => {
  const data = structuredClone(catalogs[0]);
  data[0].provenance.publishedDate = '2026-01-15';
  data[0].provenance.lastReviewedAt = '2026-10-25';
  assert.equal(catalogSchema.safeParse(data).success, true);
  assert.equal(catalogSchema.safeParse([]).success, false);
});
