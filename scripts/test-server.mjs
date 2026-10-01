import http from 'http';
import fs from 'fs';
import path from 'path';
import url from 'url';

const PORT = 3333;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml'
};

const scannerHandler = (await import('../api/scanner.js')).default;

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const raw = Buffer.concat(chunks).toString('utf8');
      try {
        body = JSON.parse(raw);
      } catch (e) {
        body = {};
      }
    }

    const mockReq = {
      method: req.method,
      url: req.url,
      headers: req.headers,
      query: parsedUrl.query,
      body
    };

    const mockRes = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader(k, v) {
        this.headers[k] = v;
        res.setHeader(k, v);
        return this;
      },
      json(data) {
        res.writeHead(this.statusCode, { 'Content-Type': 'application/json', ...this.headers });
        res.end(JSON.stringify(data));
        return this;
      },
      send(data) {
        res.writeHead(this.statusCode, this.headers);
        res.end(data);
        return this;
      },
      end(data) {
        res.writeHead(this.statusCode, this.headers);
        res.end(data);
        return this;
      }
    };

    return scannerHandler(mockReq, mockRes);
  }

  // Handle Static files & rewrites
  let filePath = pathname === '/' || pathname === '/scan' ? 'scan.html' : pathname.replace(/^\//, '');
  let resolvedPath = path.resolve(process.cwd(), filePath);

  if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
    const ext = path.extname(resolvedPath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(resolvedPath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not found: ' + pathname);
  }
});

server.listen(PORT, () => {
  console.log(`Local test server running at http://localhost:${PORT}`);
});
