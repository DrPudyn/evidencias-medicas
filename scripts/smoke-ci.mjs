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
  const db = await worker.getD1Database('DB');
  const call = async (path, input) => {
    const response = await fetch(origin+path,{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(input)});
    return {status:response.status, data:await response.json(), cookie:response.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};
  };
  const email = `legacy-${Date.now()}@example.test`, password = 'First access test password 2026';
  await db.prepare('INSERT INTO users(id,email,profile,created_at) VALUES(?,?,?,?)').bind(crypto.randomUUID(),email,'{}',Date.now()).run();
  const migrated = await call('/api/auth/password',{email,password,mode:'first-access'});
  assert.equal(migrated.status,200);
  assert.ok(migrated.cookie.includes('em_session='));
  assert.equal((await call('/api/auth/password',{email,password:password+'changed',mode:'first-access'})).status,409);
  assert.equal((await call('/api/auth/password',{email,password,mode:'login'})).status,200);
  assert.equal((await call('/api/auth/password',{email:'missing@example.test',password,mode:'first-access'})).status,409);
  const adminEmail = 'evidenciasmedicas@outlook.com';
  const admin = await call('/api/auth/password',{email:adminEmail,password,mode:'first-access'});
  assert.equal(admin.status,200);
  assert.equal(admin.data.user.role,'admin');
  assert.ok(admin.cookie.includes('admin_session='));
  assert.equal((await fetch(origin+'/api/admin/dashboard',{headers:{Cookie:admin.cookie}})).status,200);
  assert.equal((await call('/api/auth/password',{email:adminEmail,password,mode:'first-access'})).status,409);
  for (const bindings of [{}, {RESEND_API_KEY:'test-only'}, {EMAIL_FROM:'test@example.test'}]) {
    await worker.setOptions({...options,bindings:{LOCAL_PREVIEW_ENABLED:'false',...bindings}});
    origin = (await worker.ready).origin;
    const result = await call('/api/auth/reset',{email});
    assert.equal(result.status,503);
    assert.match(result.data.error,/não está configurada/);
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
