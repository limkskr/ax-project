import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { loadConfig } from './config.mjs';
import { PublicError, prepareChat, completeChat } from './chat.mjs';

function allowedOrigin(origin) {
  if (!origin) return true;
  try { const url = new URL(origin); return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname); }
  catch { return false; }
}
function readJson(request) {
  return new Promise((resolveBody, reject) => {
    const tooLarge = () => new PublicError(413, 'TOO_LARGE', '질문 내용이 너무 커요. 내용을 줄여 주세요.');
    if (Number(request.headers['content-length']) > 65536) { request.resume(); reject(tooLarge()); return; }
    const chunks = []; let size = 0; let overflow = false;
    request.on('data', chunk => {
      size += chunk.length;
      if (size > 65536) { if (!overflow) reject(tooLarge()); overflow = true; chunks.length = 0; }
      else if (!overflow) chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () => {
      if (overflow) return;
      try { resolveBody(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject(new PublicError(400, 'INVALID_REQUEST', '질문 형식을 확인해 주세요.')); }
    });
  });
}
export function createApiServer({ getConfig = loadConfig, fetchImpl = fetch } = {}) {
  let activeRequests = 0;
  const server = createServer(async (request, response) => {
    const send = (status, data) => { response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); response.end(JSON.stringify(data)); };
    try {
      const origin = request.headers.origin;
      if (!allowedOrigin(origin)) throw new PublicError(403, 'FORBIDDEN_ORIGIN', '허용되지 않은 앱 주소입니다.');
      if (origin) { response.setHeader('Access-Control-Allow-Origin', origin); response.setHeader('Vary', 'Origin'); }
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      if (request.method === 'OPTIONS') { response.writeHead(204); response.end(); return; }
      if (request.method === 'GET' && request.url === '/api/health') {
        const config = getConfig();
        const address = server.address()?.address;
        const network = !address || address === '::1' || address.startsWith('127.') || address.startsWith('::ffff:127.') ? 'loopback' : 'lan';
        send(200, { service: 'kit-professor-ai-api', network, configured: !!config.apiKey,
          modelConfigured: !!config.apiKey, provider: 'groq', model: config.model, mode: 'groq-only', knowledgeConnected: false }); return;
      }
      if (request.method !== 'POST' || request.url !== '/api/chat') { send(404, { error: { code: 'NOT_FOUND', message: '요청 주소를 확인해 주세요.' } }); return; }
      if (!request.headers['content-type']?.startsWith('application/json')) throw new PublicError(415, 'INVALID_CONTENT_TYPE', 'JSON 형식으로 질문을 보내 주세요.');
      const messages = prepareChat(await readJson(request));
      const config = getConfig();
      if (activeRequests >= 2) throw new PublicError(429, 'BUSY', '다른 답변을 처리하고 있어요. 잠시 후 다시 시도해 주세요.');
      activeRequests++;
      try { send(200, await completeChat(config, messages, fetchImpl)); }
      finally { activeRequests--; }
    } catch (error) {
      const safe = error instanceof PublicError ? error : new PublicError(500, 'SERVER_ERROR', '서버에서 요청을 처리하지 못했어요. 다시 시도해 주세요.');
      if (!response.headersSent) send(safe.status, { error: { code: safe.code, message: safe.message } });
    }
  });
  server.requestTimeout = 15000;
  return server;
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { host, port } = loadConfig();
  const server = createApiServer();
  server.on('error', () => { console.error(`API 서버를 시작하지 못했습니다. 포트 ${port}을 확인해 주세요.`); process.exitCode = 1; });
  server.listen(port, host, () => console.log(`교수AI API: http://${host}:${port} (키 값은 로그에 표시하지 않습니다)`));
}
