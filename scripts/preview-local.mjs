import { createServer, request as proxyRequest } from 'node:http';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, openSync, closeSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { setTimeout as pause } from 'node:timers/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { projectRoot } from './sites-env.mjs';

const publicPort = 5173;
const workerPort = 5174;
if (!existsSync(path.join(projectRoot, 'dist/server/wrangler.json'))) {
  throw new Error('Compile o projeto com npm run build antes de iniciar a prévia.');
}
const configPath = path.join(projectRoot, '.dev.vars');
const local = existsSync(configPath) ? parseEnv(readFileSync(configPath, 'utf8')) : {};
const runtimeDir = path.join(projectRoot, '.sites-runtime');
mkdirSync(runtimeDir, { recursive: true });
const logFile = openSync(path.join(runtimeDir, 'preview-worker.log'), 'w');
const args = [
  '--import', pathToFileURL(path.join(projectRoot, 'scripts/sites-env.mjs')).href,
  path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js'),
  'dev', '--config', path.join(projectRoot, 'dist/server/wrangler.json'),
  '--local', '--persist-to', path.join(projectRoot, '.wrangler/state'),
  '--ip', '127.0.0.1', '--port', String(workerPort), '--inspector-port', '0', '--log-level', 'warn',
  '--var', 'LOCAL_PREVIEW_ENABLED:true',
  '--var', 'ADMIN_RP_ID:localhost', '--var', `ADMIN_ORIGIN:http://localhost:${publicPort}`,
];
// Only these non-secret local settings enter command arguments. No external mail service is enabled.
for (const key of ['ADMIN_EMAILS', 'ADMIN_BOOTSTRAP_ENABLED', 'NCBI_CONTACT_EMAIL', 'CLINICAL_AI_PROVIDER', 'PLAN_PRICE_LABEL', 'SITE_ORIGIN', 'WORKERS_AI_MODEL']) {
  const value = process.env[key] || local[key];
  if (value) args.push('--var', `${key}:${value}`);
}
const worker = spawn(process.execPath, args, { cwd: projectRoot, windowsHide: true, stdio: ['ignore', logFile, logFile] });
closeSync(logFile);
let stopping = false;
const server = createServer((req, res) => {
  const host = req.headers.host || '';
  if (![`localhost:${publicPort}`, `127.0.0.1:${publicPort}`, `[::1]:${publicPort}`].includes(host)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Esta prévia aceita apenas acesso local.');
    return;
  }
  // Old development pages can repeatedly request source maps. Do not route these requests into the app.
  if ((req.url || '').split('?')[0] === '/__vinext_original-stack-trace') {
    res.writeHead(204, { 'Cache-Control': 'no-store' });
    res.end();
    return;
  }
  const upstream = proxyRequest({ hostname: '127.0.0.1', port: workerPort, path: req.url, method: req.method, headers: req.headers }, (reply) => {
    res.writeHead(reply.statusCode || 502, reply.headers);
    reply.pipe(res);
  });
  upstream.setTimeout(70000, () => upstream.destroy());
  upstream.on('error', () => {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('O site local está iniciando ou indisponível. Tente novamente em instantes.');
  });
  req.on('aborted', () => upstream.destroy());
  req.pipe(upstream);
});
server.requestTimeout = 75000;
function stop() {
  if (stopping) return;
  stopping = true;
  server.close();
  server.closeAllConnections();
  worker.kill();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
worker.on('error', (error) => { console.error(error.message); stop(); process.exitCode = 1; });
worker.on('exit', (code) => {
  if (!stopping) { console.error('A prévia encerrou. Diagnóstico local em .sites-runtime/preview-worker.log.'); stop(); process.exitCode = code || 1; }
});
server.on('error', (error) => { console.error(error.message); stop(); process.exitCode = 1; });
console.log('Iniciando a prévia local compilada…');
let ready = false;
for (let attempt = 0; attempt < 45 && !stopping; attempt++) {
  try {
    const response = await fetch(`http://127.0.0.1:${workerPort}/api/account`, { signal: AbortSignal.timeout(1500) });
    ready = response.ok;
    await response.body?.cancel();
    if (ready) break;
  } catch { /* Worker initialization is asynchronous. */ }
  await pause(500);
}
if (!ready || stopping) { stop(); throw new Error('A prévia não iniciou; confira o diagnóstico local.'); }
server.listen(publicPort, '127.0.0.1', () => console.log(`Prévia pronta: http://localhost:${publicPort}/ · Painel: http://localhost:${publicPort}/admin`));
