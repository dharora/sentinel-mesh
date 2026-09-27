import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IncidentStore } from './src/store.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const frontend = join(root, 'frontend');
const clients = new Set();
const send = (res, status, data) => { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(data)); };
const publish = (event) => { const payload = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`; for (const res of clients) res.write(payload); };
const store = new IncidentStore(publish);
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`); const path = url.pathname;
  if (path === '/api/events') { res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' }); res.write('event: ready\ndata: {}\n\n'); clients.add(res); req.on('close', () => clients.delete(res)); return; }
  if (path === '/api/health') return send(res, 200, { status: 'ok', runtime: 'local-governed-mesh', lyzrAdapterConfigured: Boolean(process.env.LYZR_WORKFLOW_RUN_URL && process.env.LYZR_WORKFLOW_JSON_PATH) });
  if (req.method === 'GET' && path === '/api/incidents') return send(res, 200, { incidents: store.list() });
  const body = await getBody(req);
  if (req.method === 'POST' && path === '/api/incidents') return send(res, 201, { incident: store.create(body.scenario || 'memoryLeak') });
  const run = path.match(/^\/api\/incidents\/(INC-\d+)\/run$/);
  if (req.method === 'POST' && run) { const incident = await store.run(run[1]); return incident ? send(res, 200, { incident }) : send(res, 404, { error: 'Incident not found' }); }
  const action = path.match(/^\/api\/incidents\/(INC-\d+)\/actions\/([^/]+)\/(approve|reject)$/);
  if (req.method === 'POST' && action) { const incident = store.decide(action[1], action[2], action[3], body.actor); return incident ? send(res, 200, { incident }) : send(res, 404, { error: 'Action not found' }); }
  if (path.startsWith('/api/')) return send(res, 404, { error: 'Not found' });
  const safePath = normalize(path === '/' ? '/index.html' : path).replace(/^\/+/, ''); const file = join(frontend, safePath);
  if (!file.startsWith(frontend)) return send(res, 403, { error: 'Forbidden' });
  try { await stat(file); res.writeHead(200, { 'content-type': mime[extname(file)] || 'application/octet-stream' }); res.end(await readFile(file)); } catch { res.writeHead(404); res.end('Not found'); }
});
function getBody(req) { return new Promise((resolve) => { if (!['POST','PUT','PATCH'].includes(req.method)) return resolve({}); let raw=''; req.on('data', c => raw+=c); req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch { resolve({}); } }); }); }
const port = Number(process.env.PORT || 8787);
server.listen(port, '127.0.0.1', () => console.log(`Sentinel Mesh running at http://127.0.0.1:${port}`));
