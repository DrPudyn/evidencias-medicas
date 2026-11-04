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
  d1Persist: process.env.SMOKE_DB_DIR || path.join(projectRoot, '.sites-runtime/ci-d1/v3/d1'),
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
  if (process.env.SMOKE_INIT_DB === 'true') {
    const db = await worker.getD1Database('DB');
    for (const file of (await readdir(path.join(projectRoot,'drizzle'))).filter(f=>f.endsWith('.sql')).sort()) {
      const sql = await readFile(path.join(projectRoot,'drizzle',file),'utf8');
      for (const statement of sql.split('--> statement-breakpoint').map(s=>s.trim()).filter(Boolean)) await db.prepare(statement).run();
    }
  }
  const response=await fetch(origin+'/api/auth/reset',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({email:'validation@example.test'})});
  assert.equal(response.status,503,'Recovery requires configured email service outside local preview');
  const signup=await fetch(origin+'/api/auth/password',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({mode:'register',email:`no-mail-${Date.now()}@example.test`,password:'No email required test 2026'})});
  assert.equal(signup.status,200,'Signup works without mail or preview credentials');
  const identity=await signup.json();
  assert.equal(identity.user.role,'member');
  assert.ok(signup.headers.get('set-cookie'));
  const database=await worker.getD1Database('DB');
  const stored=await database.prepare('SELECT password_hash,email_verified_at FROM users WHERE id=?').bind(identity.user.id).first();
  assert.equal(stored.email_verified_at,null,'Do not claim an unverified email was verified');
  assert.match(stored.password_hash,/^scrypt-v1\$/);
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
