import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = (relative) => fileURLToPath(new URL(relative, import.meta.url));
const SITE_DIR = ['./site', './dist'].find((dir) => existsSync(here(`${dir}/index.html`))) ?? './site';
const ROOT = resolve(here(SITE_DIR));
const PORTS = [8080, 8081, 8082, 8083, 4173];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

// The published site runs functions/ as an Edge Function behind a real Qoder sign-in.
// This copy has no Function host, so it runs the same handler in-process against an
// in-memory bucket and attaches one fixed local account. Prices, stock and uploaded
// pictures live in that bucket only: they are gone when this window closes.
const LOCAL_ACCOUNT = 'local-copy-owner';
const SKIP_RESPONSE_HEADERS = new Set(['content-encoding', 'transfer-encoding', 'connection', 'keep-alive']);

async function openLocalShop() {
  for (const root of ['./source/', './']) {
    try {
      const [handlerModule, fakeModule, serverModule] = await Promise.all([
        import(new URL(`${root}functions/handler.mjs`, import.meta.url).href),
        import(new URL(`${root}dev/fake-storage.mjs`, import.meta.url).href),
        import(new URL(`${root}dev/shop-server.mjs`, import.meta.url).href),
      ]);
      const storage = fakeModule.createFakeStorage();
      return {
        handle: handlerModule.createAppHandler({ storage }),
        storage,
        account: serverModule.encodeUserContext(LOCAL_ACCOUNT),
      };
    } catch {
      // A copy without the editable project beside it stays display-only.
    }
  }
  return null;
}

const shop = await openLocalShop();

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function serveShop(req, res, url) {
  if (url.pathname.startsWith('/fake-storage/')) {
    const key = decodeURIComponent(url.pathname.slice('/fake-storage/'.length));
    const object = shop.storage.objects.get(key);
    if (!object) {
      res.writeHead(404).end('missing');
      return;
    }
    res.writeHead(200, {
      'content-type': object.contentType,
      'content-length': String(object.bytes.byteLength),
      'cache-control': 'no-store',
    }).end(object.bytes);
    return;
  }

  const method = req.method ?? 'GET';
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (key.toLowerCase() === 'host') continue;
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
    else if (value !== undefined) headers.set(key, value);
  }
  headers.set('x-qoder-user-context', shop.account);
  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req);
  const response = await shop.handle(new Request(url, { method, headers, body }));
  const outHeaders = {};
  response.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) outHeaders[key] = value;
  });
  res.writeHead(response.status, outHeaders).end(Buffer.from(await response.arrayBuffer()));
}

const handler = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const requested = decodeURIComponent(url.pathname);

  if (shop && (requested === '/functions/v1/app' || requested.startsWith('/fake-storage/'))) {
    try {
      await serveShop(req, res, url);
    } catch (error) {
      res.writeHead(500, { 'content-type': 'application/json' })
        .end(JSON.stringify({ error: 'local_copy_failure', detail: String(error?.message ?? error) }));
    }
    return;
  }

  // Resolve inside ROOT only — reject anything that escapes it
  const target = resolve(join(ROOT, normalize(requested === '/' ? 'index.html' : requested)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  let file = target;
  try {
    let info = await stat(file);
    if (info.isDirectory()) {
      file = join(file, 'index.html');
      info = await stat(file);
    }
    const stream = createReadStream(file);
    res.writeHead(200, {
      'content-type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
      'content-length': info.size,
      'cache-control': 'no-cache',
    });
    stream.pipe(res);
    stream.on('error', () => res.end());
  } catch {
    // Real files answer 404; only extension-less routes fall back to the app shell
    if (extname(requested)) {
      res.writeHead(404).end('Not found');
      return;
    }
    res.writeHead(200, { 'content-type': MIME['.html'], 'cache-control': 'no-cache' });
    createReadStream(join(ROOT, 'index.html')).pipe(res);
  }
};

const tryListen = (port) =>
  new Promise((accept) => {
    const server = createServer(handler);
    server.once('error', () => accept(null));
    server.listen(port, '127.0.0.1', () => accept({ server, port }));
  });

for (const port of PORTS) {
  const bound = await tryListen(port);
  if (bound) {
    const address = `http://localhost:${bound.port}`;
    console.log(`\n  Ram Rass is running:  ${address}\n  Stop with Ctrl+C, or just close this window.\n`);
    console.log(shop
      ? '  Shop data: this window holds it, so edits reset when you close it.\n'
      : '  Shop data: project files were not found beside the site, so this copy is display-only.\n');
    if (!process.env.NO_BROWSER) {
      spawn('cmd', ['/c', 'start', '', address], { stdio: 'ignore', detached: true }).unref();
    }
    break;
  }
}
