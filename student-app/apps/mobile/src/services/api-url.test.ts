import { expect, it } from 'vitest';
import { resolveApiUrl } from './api-url';

it('resolves the backend for web, iOS, Android emulator and physical phones', () => {
  expect(resolveApiUrl({ platform: 'web', webHostname: 'localhost' })).toBe('http://localhost:3001');
  expect(resolveApiUrl({ platform: 'ios', hostUri: '127.0.0.1:8081' })).toBe('http://127.0.0.1:3001');
  expect(resolveApiUrl({ platform: 'android', hostUri: 'localhost:8081' })).toBe('http://10.0.2.2:3001');
  expect(resolveApiUrl({ platform: 'android', hostUri: '192.168.0.10:8081' })).toBe('http://192.168.0.10:3001');
  expect(resolveApiUrl({ platform: 'ios', hostUri: 'exp://192.168.0.10:8081' })).toBe('http://192.168.0.10:3001');
  expect(resolveApiUrl({ platform: 'ios', override: 'https://api.example.com/' })).toBe('https://api.example.com');
});
