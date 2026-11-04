export function resolveApiUrl({ platform, hostUri, webHostname, override }: {
  platform: string; hostUri?: string | null; webHostname?: string; override?: string;
}): string {
  if (override?.trim()) return override.trim().replace(/\/+$/, '');
  let host = platform === 'web' ? webHostname || 'localhost' : '127.0.0.1';
  if (platform !== 'web' && hostUri) {
    try { host = new URL(hostUri.includes('://') ? hostUri : `http://${hostUri}`).hostname; } catch { /* Use the local simulator address. */ }
  }
  if (platform === 'android' && ['localhost', '127.0.0.1', '[::1]'].includes(host)) host = '10.0.2.2';
  return `http://${host}:3001`;
}
