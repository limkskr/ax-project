import { spawn } from 'node:child_process';
import { access, chmod, copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { connect } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { apiReuseError, expoReuseError, expoManifestUrl } from './dev-reuse.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const mobile = resolve(root, 'apps/mobile');
const api = resolve(root, 'apps/api');
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.once('SIGINT', () => stop());
process.once('SIGTERM', () => stop());
function launch(command, args, cwd, env = process.env, shell = false) {
  const child = spawn(command, args, { cwd, env, stdio: 'inherit', shell });
  children.add(child);
  child.on('error', () => { console.error('개발 서버를 실행하지 못했습니다. Node.js 설치를 확인해 주세요.'); stop(1); });
  child.on('exit', code => { children.delete(child); if (!stopping) stop(code || 0); });
  return child;
}
async function json(url, headers = {}) {
  try { const response = await fetch(url, { headers, signal: AbortSignal.timeout(1500) }); return response.ok ? await response.json() : null; }
  catch { return null; }
}
async function portIsOpen(port) {
  return new Promise(resolveOpen => {
    const socket = connect({ host: '127.0.0.1', port });
    socket.setTimeout(1000);
    socket.once('connect', () => { socket.destroy(); resolveOpen(true); });
    socket.once('error', () => resolveOpen(false));
    socket.once('timeout', () => { socket.destroy(); resolveOpen(false); });
  });
}
async function waitFor(check) {
  const deadline = Date.now() + 25000;
  while (!stopping && Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolveWait => setTimeout(resolveWait, 300));
  }
  throw new Error(stopping ? '개발 서버 실행이 중단되었습니다. 위 오류를 확인해 주세요.' : '서버 준비 시간이 초과되었습니다. 위 실행 오류를 확인해 주세요.');
}
try {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) throw new Error('Node.js 22.13 이상이 필요합니다. 팀 권장 버전은 22.23.2입니다.');
  const envPath = resolve(api, '.env');
  try { await access(envPath); }
  catch { await copyFile(resolve(api, '.env.example'), envPath, constants.COPYFILE_EXCL); console.log('apps/api/.env를 준비했습니다. 편집기로 열어 GROQ_API_KEY를 저장해 주세요.'); }
  if (process.platform !== 'win32') await chmod(envPath, 0o600);
  const expoCli = resolve(mobile, 'node_modules/expo/bin/cli');
  for (const [directory, marker, label] of [[mobile, expoCli, '앱']]) {
    try { await access(marker); }
    catch {
      console.log(`${label} 개발에 필요한 패키지를 설치합니다. 첫 실행에서만 잠시 걸립니다.`);
      const install = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci'], { cwd: directory, stdio: 'inherit', shell: process.platform === 'win32' });
      const exitCode = await new Promise(resolveInstall => { install.on('exit', resolveInstall); install.on('error', () => resolveInstall(1)); });
      if (exitCode !== 0) throw new Error('패키지 설치에 실패했습니다. 네트워크와 Node.js 버전을 확인해 주세요.');
    }
  }
  const health = () => json('http://127.0.0.1:3001/api/health');
  const existingApi = await health();
  if (existingApi?.service === 'kit-professor-ai-api') {
    const error = apiReuseError(existingApi);
    if (error) throw new Error(error);
    console.log('실행 중인 교수AI API를 재사용합니다.');
  }
  else {
    if (await portIsOpen(3001)) throw new Error('3001 포트를 다른 서버가 사용 중입니다. 해당 서버를 확인한 후 다시 실행해 주세요.');
    launch(process.execPath, ['src/server.mjs'], api, { ...process.env, API_HOST: '0.0.0.0', PORT: '3001' });
    await waitFor(async () => (await health())?.service === 'kit-professor-ai-api');
  }
  const manifest = () => json(expoManifestUrl(), { Accept: 'application/json', 'expo-platform': 'ios' });
  const ours = value => value?.extra?.expoGo?.developer?.projectRoot && resolve(value.extra.expoGo.developer.projectRoot) === mobile;
  const existingExpo = await manifest();
  if (ours(existingExpo)) {
    const error = expoReuseError(existingExpo);
    if (error) throw new Error(error);
    console.log('실행 중인 이 프로젝트의 Expo 서버를 재사용합니다.');
  }
  else {
    if (await portIsOpen(8081)) throw new Error('8081 포트를 다른 서버가 사용 중입니다. 해당 서버를 확인한 후 다시 실행해 주세요.');
    // Model and database credentials belong only to the API process.
    const expoEnv = { ...process.env };
    for (const name of ['GROQ_API_KEY', 'GEMINI_API_KEY', 'DATABASE_URL', 'CALENDAR_WORKER_DATABASE_URL', 'CALENDAR_TEST_DATABASE_URL', 'NOTICE_WORKER_DATABASE_URL', 'NOTICE_STORAGE_SECRET', 'NOTICE_STORAGE_URL', 'REACT_NATIVE_PACKAGER_HOSTNAME']) delete expoEnv[name];
    launch(process.execPath, [expoCli, 'start', '--host', 'lan', '--port', '8081', ...(process.argv.includes('--web') ? ['--web'] : [])], mobile, expoEnv);
    await waitFor(async () => ours(await manifest()));
  }
  console.log('\n교수AI 준비 완료 · 웹: http://localhost:8081 · 휴대폰: Expo QR 코드');
  if (!(await health())?.configured) console.log('키를 apps/api/.env에 저장하면 다음 요청부터 반영됩니다.');
} catch (error) { console.error(error.message); stop(1); }
