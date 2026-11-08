// 초경량 정적 서버(프리뷰 렌더링용). 사용: node tools/preview_server.js [port]
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.glb': 'application/octet-stream', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const port = +(process.argv[2] || 8090);
http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
  const f = path.join(ROOT, u);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(f).pipe(res);
}).listen(port, () => console.log('serving ' + ROOT + ' on ' + port));
