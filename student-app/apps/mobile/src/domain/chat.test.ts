import { describe, expect, it } from 'vitest';
import { emptySession, openConversation, readPersistedSession } from './session';

const old = openConversation(emptySession('student'), 'ai-001', 'window', 100);
describe('chat history recovery', () => {
  it('keeps existing version 1 sessions without chat history readable', () => {
    expect(readPersistedSession(JSON.stringify(old))).toEqual(old);
  });
  it('keeps completed history and turns interrupted sends into manual retries', () => {
    const messages = [
      { id: '1', role: 'user', content: '첫 질문', createdAt: 110, status: 'complete' },
      { id: '2', role: 'assistant', content: '첫 답변', createdAt: 120, status: 'complete' },
      { id: '3', role: 'user', content: '전송 중 질문', createdAt: 130, status: 'pending' },
    ];
    const saved = { ...old, conversations: [{ ...old.conversations[0], messages }] };
    const restored = readPersistedSession(JSON.stringify(saved));
    expect(restored?.conversations[0].messages).toEqual([messages[0], messages[1], { ...messages[2], status: 'failed' }]);
  });
  it('rejects malformed messages instead of silently erasing the saved chat', () => {
    const saved = { ...old, conversations: [{ ...old.conversations[0], messages: [{ id: 'x', role: 'system', content: 'invalid', createdAt: 1, status: 'complete' }] }] };
    expect(() => readPersistedSession(JSON.stringify(saved))).toThrow();
  });
});
