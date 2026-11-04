import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApiServer } from '../src/server.mjs';

async function app(t) {
  let calls = 0;
  const server = createApiServer({
    getConfig: () => ({ apiKey: 'test-only-key', model: 'test-model', timeoutMs: 1000 }),
    fetchImpl: async () => { calls++; return new Response(JSON.stringify({ choices: [{ message: { content: '학습 답변' } }] })); },
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  return { url: `http://127.0.0.1:${server.address().port}`, calls: () => calls };
}
test('app-only health declares knowledge disconnected without calendar storage', async t => {
  const a = await app(t); const body = await (await fetch(a.url + '/api/health')).json();
  assert.equal(body.knowledgeConnected, false);
  assert.equal(body.calendar, undefined);
  assert.equal(body.mode, 'groq-only');
  assert.equal(a.calls(), 0);
});
test('retired sources endpoint is absent', async t => {
  const a = await app(t); assert.equal((await fetch(a.url + '/api/sources')).status, 404);
});
test('academic questions return an explicit disconnected notice without model guesses', async t => {
  const a = await app(t);
  const response = await fetch(a.url + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
    professorId: 'ai-001', academicContext: { grade: '2', unitId: 'computing', programId: 'ai' },
    messages: [{ role: 'user', content: '올해 기말고사 기간은 언제야?' }],
  }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.model, 'knowledge-not-connected');
  assert.match(body.reply, /연결되어 있지/);
  assert.equal(body.calendar, undefined);
  assert.equal(a.calls(), 0);
});
