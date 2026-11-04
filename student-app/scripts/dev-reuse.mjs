import { networkInterfaces } from 'node:os';
const loopback = host => host === 'localhost' || host === '[::1]' || /^127\./.test(host);
export function expoManifestUrl(interfaces = networkInterfaces()) {
  // Expo constructs hostUri from the request host. A loopback probe cannot
  // distinguish an ordinary LAN server from a simulator-only advertised host.
  const address = Object.values(interfaces).flat().find(row => row && row.family === 'IPv4' && !row.internal)?.address;
  return `http://${address || '127.0.0.1'}:8081`;
}

export function apiReuseError(health) {
  return health.network === 'lan' && health.mode === 'groq-only' ? null : '현재 API는 휴대폰 접근이 가능한 서버로 확인되지 않았습니다. API를 실행한 터미널에서 Ctrl+C로 종료하고 프로젝트 루트에서 npm run dev를 다시 실행해 주세요.';
}
export function expoReuseError(manifest) {
  let host;
  try { host = new URL(`http://${manifest.extra.expoClient.hostUri}`).hostname; } catch { /* Unknown host requires restart. */ }
  return host && !loopback(host) ? null : '현재 Expo 서버는 휴대폰용 네트워크 주소가 아닙니다. Expo를 실행한 터미널에서 Ctrl+C로 종료하고 프로젝트 루트에서 npm run dev를 다시 실행해 주세요.';
}
