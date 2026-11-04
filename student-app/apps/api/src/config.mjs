import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const envPath = new URL('../.env', import.meta.url);

// Read on every request so saving a new local key does not require a restart.
export function loadConfig() {
  let local = {};
  try { local = parseEnv(readFileSync(envPath, 'utf8')); }
  catch (error) { if (error.code !== 'ENOENT') throw new Error('서버 설정 파일을 읽지 못했어요.'); }
  const value = (name, fallback = '') => process.env[name]?.trim() || local[name]?.trim() || fallback;
  const port = Number(value('PORT', '3001'));
  return {
    apiKey: value('GROQ_API_KEY'), model: value('GROQ_MODEL', 'qwen/qwen3.8-27b'),
    host: value('API_HOST', '127.0.0.1'), port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 3001,
    timeoutMs: 65000,
  };
}
