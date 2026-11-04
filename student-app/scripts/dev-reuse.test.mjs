import { test } from 'node:test';
import assert from 'node:assert/strict';
import { apiReuseError, expoReuseError, expoManifestUrl } from './dev-reuse.mjs';

test('loopback-only and older API servers require a clear restart instruction', () => {
  assert.match(apiReuseError({ network: 'loopback' }), /Ctrl\+C/);
  assert.match(apiReuseError({}), /npm run dev/);
  assert.equal(apiReuseError({ network: 'lan', mode: 'groq-only' }), null);
});
test('an older calendar API cannot silently be reused by the app-only launcher', () => {
  assert.match(apiReuseError({ network: 'lan' }), /Ctrl\+C/);
});
test('existing Expo servers with a simulator-only advertised host cannot be called phone-ready', () => {
  for (const hostUri of ['127.0.0.1:8081', 'localhost:8081', '[::1]:8081']) {
    assert.match(expoReuseError({ extra: { expoClient: { hostUri } } }), /Ctrl\+C/);
  }
  assert.equal(expoReuseError({ extra: { expoClient: { hostUri: '192.168.23.21:8081' } } }), null);
});
test('probes Expo through a LAN address because its manifest reflects the request hostname', () => {
  const interfaces = {
    lo0: [{ address: '127.0.0.1', family: 'IPv4', internal: true }],
    en0: [{ address: 'fe80::1', family: 'IPv6', internal: false }, { address: '192.168.23.21', family: 'IPv4', internal: false }],
  };
  assert.equal(expoManifestUrl(interfaces), 'http://192.168.23.21:8081');
  assert.equal(expoManifestUrl({ lo0: interfaces.lo0 }), 'http://127.0.0.1:8081');
});
