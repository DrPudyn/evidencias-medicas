import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { Miniflare } from 'miniflare';
import { projectRoot } from './sites-env.mjs';

// Run the compiled Worker without Wrangler's watching/restarting dev proxy.
// Never load .dev.vars or provide mail/NCBI credentials in this harness.
const root = path.join(projectRoot, 'dist/server');
const config = JSON.parse(await readFile(path.join(root, 'wrangler.json'), 'utf8'));
const entry = path.resolve(root, config.main);
const modules = (await readdir(root, { recursive: true }))
  .filter(file => /\.(m?js)$/.test(file))
  .map(file => ({ type: 'ESModule', path: path.join(root, file) }))
  .sort((a, b) => Number(b.path === entry) - Number(a.path === entry));
const outbound = [];
const options = {
  modules,
  modulesRoot: root,
  compatibilityDate: config.compatibility_date,
  compatibilityFlags: config.compatibility_flags,
  d1Databases: Object.fromEntries(config.d1_databases.map(db => [db.binding, db.database_id])),
  d1Persist: path.join(projectRoot, '.sites-runtime/ci-d1/v3/d1'),
  cf: false,
  host: '127.0.0.1',
  port: 0,
  bindings: { LOCAL_PREVIEW_ENABLED: 'false' },
  outboundService(request) {
    outbound.push(new URL(request.url).origin);
    return new Response('External network is forbidden in CI smoke', { status: 599 });
  },
};
const worker = new Miniflare(options);
try {
  let origin = (await worker.ready).origin;
  const profile = { mode: 'register', role: 'student', name: 'Teste CI', college: 'Faculdade CI', state: 'MG', email: 'validation@example.test', privacyConsent: true };
  for (const [input, status, error] of [
    [{ ...profile, state: 'ZZ' }, 400, 'Selecione um estado.'],
    [{ ...profile, whatsappNotifications: true }, 400, 'Informe seu WhatsApp para autorizar notificações.'],
    [profile, 503, 'O envio de códigos ainda não foi ativado.'],
  ]) {
    const response = await fetch(origin + '/api/auth/request', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(input),
    });
    const result = await response.json();
    assert.equal(response.status, status, `auth validation without preview: ${JSON.stringify(result)}`);
    assert.ok(result.error.startsWith(error));
  }
  await worker.setOptions({ ...options, bindings: { LOCAL_PREVIEW_ENABLED: 'true' } });
  origin = (await worker.ready).origin;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/smoke-test.mjs'], {
      cwd: projectRoot, stdio: 'inherit', env: { ...process.env, SMOKE_ORIGIN: origin },
    });
    child.on('error', reject);
    child.on('exit', code => resolve(code));
  });
  assert.equal(code, 0, 'Smoke test process failed');
  assert.deepEqual(outbound, [], 'Smoke attempted external requests (even if the route caught the failure)');
  console.log('PASS: validation without preview/mail credentials; zero external requests.');
} finally {
  await worker.dispose();
}
