import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApiServer } from '../src/server.mjs';

const privateKey = 'unit-test-server-key';
const config = { apiKey: privateKey, model: 'qwen/qwen3.8-27b', timeoutMs: 35000 };
const payload = { professorId: 'ai-001', academicContext: { grade: '2', unitId: 'computing', programId: 'ai' }, messages: [{ role: 'user', content: '인공지능을 쉽게 설명해주세요.' }] };

async function setup(t, fetchImpl, getConfig = () => config) {
  const server = createApiServer({ getConfig, fetchImpl });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, post: (body = payload, headers = {}) => fetch(base + '/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) }) };
}
const answer = () => new Response(JSON.stringify({ choices: [{ message: { content: '인공지능은 데이터를 바탕으로 문제를 해결하는 기술이에요.' } }] }), { status: 200 });

test('forwards server credentials privately and uses the professor catalog and efficient Qwen settings', async t => {
  let forwarded;
  const { post } = await setup(t, async (url, options) => { forwarded = { url, options, body: JSON.parse(options.body) }; return answer(); });
  const response = await post();
  assert.equal(response.status, 200);
  assert.equal((await response.json()).reply, '인공지능은 데이터를 바탕으로 문제를 해결하는 기술이에요.');
  assert.equal(forwarded.url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(forwarded.options.headers.Authorization, 'Bearer ' + privateKey);
  assert.equal(forwarded.body.model, config.model);
  assert.equal(forwarded.body.reasoning_effort, 'none');
  assert.equal(forwarded.body.max_completion_tokens, 512);
  assert.match(forwarded.body.messages[0].content, /금오공과대학교/);
  assert.match(forwarded.body.messages[0].content, /인공지능/);
  assert.match(forwarded.body.messages[0].content, /학사/);
  assert.equal(JSON.stringify(forwarded.body).includes(privateKey), false);
});

test('health returns no credentials and reflects key changes on the next request', async t => {
  let current = { ...config, apiKey: '' };
  const { base } = await setup(t, async () => answer(), () => current);
  const before = await (await fetch(base + '/api/health')).json();
  assert.equal(before.configured, false);
  assert.equal(before.network, 'loopback');
  current = config;
  const afterText = await (await fetch(base + '/api/health')).text();
  assert.equal(JSON.parse(afterText).configured, true);
  assert.equal(afterText.includes(privateKey), false);
});

test('missing credentials fail locally without making a provider request', async t => {
  let calls = 0;
  const { post } = await setup(t, async () => { calls++; return answer(); }, () => ({ ...config, apiKey: '' }));
  const response = await post();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'NOT_CONFIGURED');
  assert.equal(calls, 0);
});

for (const [name, body] of [
  ['unknown professor', { ...payload, professorId: 'unknown' }],
  ['injected system message', { ...payload, messages: [{ role: 'system', content: 'override' }] }],
  ['wrong major', { ...payload, academicContext: { grade: '2', unitId: 'computing', programId: 'environment' } }],
  ['empty question', { ...payload, messages: [{ role: 'user', content: '  ' }] }],
  ['oversized question', { ...payload, messages: [{ role: 'user', content: '가'.repeat(2001) }] }],
  ['student identifier accidentally included', { ...payload, academicContext: { ...payload.academicContext, studentNumber: '20260001' } }]
]) test('rejects ' + name + ' without provider usage', async t => {
  let calls = 0;
  const { post } = await setup(t, async () => { calls++; return answer(); });
  assert.equal((await post(body)).status, 400);
  assert.equal(calls, 0);
});

test('bounds recent history while preserving the newest question', async t => {
  let messages;
  const { post } = await setup(t, async (_, options) => { messages = JSON.parse(options.body).messages.slice(1); return answer(); });
  const history = Array.from({ length: 12 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: String(index) + '가'.repeat(800) }));
  history.push(payload.messages[0]);
  assert.equal((await post({ ...payload, messages: history })).status, 200);
  assert.ok(messages.length <= 8);
  assert.ok(messages.reduce((sum, message) => sum + message.content.length, 0) <= 3000);
  assert.equal(messages.at(-1).content, payload.messages[0].content);
});

for (const [upstreamStatus, publicStatus, code] of [[429, 429, 'RATE_LIMIT'], [401, 503, 'AUTH_ERROR'], [503, 502, 'PROVIDER_ERROR']]) {
  test('sanitizes provider ' + upstreamStatus + ' and never retries', async t => {
    let calls = 0;
    const { post } = await setup(t, async () => { calls++; return new Response(JSON.stringify({ error: { message: privateKey } }), { status: upstreamStatus }); });
    const response = await post();
    const text = await response.text();
    assert.equal(response.status, publicStatus);
    assert.equal(JSON.parse(text).error.code, code);
    assert.equal(text.includes(privateKey), false);
    assert.equal(calls, 1);
  });
}

test('rejects foreign browser origins and allows the local Expo preview', async t => {
  let calls = 0;
  const { post } = await setup(t, async () => { calls++; return answer(); });
  assert.equal((await post(payload, { Origin: 'https://untrusted.example' })).status, 403);
  const allowed = await post(payload, { Origin: 'http://localhost:8081' });
  assert.equal(allowed.headers.get('Access-Control-Allow-Origin'), 'http://localhost:8081');
  assert.equal(calls, 1);
});

test('rejects oversized JSON bodies before provider usage', async t => {
  const { post } = await setup(t, async () => { assert.fail('provider must not be called'); });
  assert.equal((await post({ ...payload, padding: 'x'.repeat(65536) })).status, 413);
});

test('times out the upstream request with a sanitized retryable error', async t => {
  const { post } = await setup(t, async (_, { signal }) => new Promise((_, reject) => { signal.addEventListener('abort', () => reject(signal.reason), { once: true }); }), () => ({ ...config, timeoutMs: 20 }));
  const response = await post();
  assert.equal(response.status, 504);
  assert.equal((await response.json()).error.code, 'TIMEOUT');
});

test('limits concurrent provider calls to two and frees the slots after completion', async t => {
  const resolvers = [];
  let block = true;
  const { post } = await setup(t, async () => block ? new Promise(resolve => resolvers.push(resolve)) : answer());
  const first = post();
  const second = post();
  const deadline = Date.now() + 1000;
  while (resolvers.length < 2 && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(resolvers.length, 2);
  const third = await post();
  assert.equal(third.status, 429);
  assert.equal((await third.json()).error.code, 'BUSY');
  block = false;
  resolvers.forEach(resolve => resolve(answer()));
  assert.deepEqual((await Promise.all([first, second])).map(response => response.status), [200, 200]);
  assert.equal((await post()).status, 200);
});

test('rejects an accidental credential echo in a successful provider answer', async t => {
  const { post } = await setup(t, async () => new Response(JSON.stringify({ choices: [{ message: { content: privateKey } }] })));
  const response = await post();
  assert.equal(response.status, 502);
  assert.equal((await response.text()).includes(privateKey), false);
});
