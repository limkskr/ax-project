import { describe, expect, it, vi } from 'vitest';
import { emptySession, openConversation } from '../domain/session';
import type { SessionData, StudentProfile } from '../domain/types';
import type { ChatRequest } from '../domain/chat';
import { createSessionStore } from './session-store';

const profile: StudentProfile = { name: '개인 이름', studentNumber: '20269999', grade: '2', unitId: 'computing', programId: 'ai' };
const saved = openConversation({ ...emptySession('student'), profile }, 'ai-001', 'window', 100);
async function setup(transport: (request: ChatRequest) => Promise<{ reply: string; model: string }>, raw = JSON.stringify(saved)) {
  const writes: SessionData[] = [];
  const store = createSessionStore({ read: async () => raw, write: async session => { writes.push(session); } }, transport);
  await store.getState().hydrate();
  return { store, writes };
}

describe('professor-specific chat', () => {
  it('does not consume model quota when the question cannot be saved, and permits retry after recovery', async () => {
    let writable = false;
    const transport = vi.fn(async () => ({ reply: '복구 후 답변', model: 'test' }));
    const store = createSessionStore({
      read: async () => JSON.stringify(saved),
      write: async () => { if (!writable) throw new Error('storage full'); },
    }, transport);
    await store.getState().hydrate();
    await store.getState().sendMessage('ai-001', '저장할 질문');
    expect(transport).not.toHaveBeenCalled();
    expect(store.getState().session.conversations[0].messages?.[0].status).toBe('failed');
    expect(store.getState().storageError).toBeTruthy();
    writable = true;
    await store.getState().retryMessage('ai-001');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(store.getState().session.conversations[0].messages?.map(m => m.content)).toEqual(['저장할 질문', '복구 후 답변']);
  });
  it('sends only academic context and persists both sides of the conversation', async () => {
    let request: ChatRequest | undefined;
    const { store, writes } = await setup(async body => { request = body; return { reply: '반가워요.', model: 'test' }; });
    expect(await store.getState().sendMessage('ai-001', '  안녕하세요  ')).toBe(true);
    expect(request?.academicContext).toEqual({ grade: '2', unitId: 'computing', programId: 'ai' });
    expect(JSON.stringify(request)).not.toContain(profile.name);
    expect(JSON.stringify(request)).not.toContain(profile.studentNumber);
    expect(request?.messages).toEqual([{ role: 'user', content: '안녕하세요' }]);
    expect(writes.at(-1)?.conversations[0].messages?.map(m => [m.role, m.content, m.status])).toEqual([
      ['user', '안녕하세요', 'complete'], ['assistant', '반가워요.', 'complete'],
    ]);
  });

  it('prevents duplicate sends and preserves both windows when responses arrive out of order', async () => {
    const requests: ChatRequest[] = [];
    const resolvers: ((reply: { reply: string; model: string }) => void)[] = [];
    const { store } = await setup(body => { requests.push(body); return new Promise(resolve => resolvers.push(resolve)); });
    const first = store.getState().sendMessage('ai-001', '첫 교수 질문');
    expect(await store.getState().sendMessage('ai-001', '중복 질문')).toBe(false);
    await store.getState().selectProfessor('computer-011');
    const second = store.getState().sendMessage('computer-011', '다른 교수 질문');
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    resolvers[1]({ reply: '다른 교수 답변', model: 'test' }); await second;
    resolvers[0]({ reply: '첫 교수 답변', model: 'test' }); await first;
    const session = store.getState().session;
    expect(session.lastProfessorId).toBe('computer-011');
    expect(session.conversations[0].messages?.map(m => m.content)).toEqual(['첫 교수 질문', '첫 교수 답변']);
    expect(session.conversations[1].messages?.map(m => m.content)).toEqual(['다른 교수 질문', '다른 교수 답변']);
    expect(store.getState().pendingByProfessor).toMatchObject({ 'ai-001': false, 'computer-011': false });
  });

  it('retries a failed send manually without duplicating the user message', async () => {
    let attempts = 0;
    const { store } = await setup(async () => { if (++attempts === 1) throw new Error('한도에 도달했어요.'); return { reply: '재시도 답변', model: 'test' }; });
    expect(await store.getState().sendMessage('ai-001', '질문')).toBe(true);
    expect(attempts).toBe(1);
    expect(store.getState().session.conversations[0].messages?.[0].status).toBe('failed');
    expect(store.getState().chatErrors['ai-001']).toBeTruthy();
    await store.getState().retryMessage('ai-001');
    expect(attempts).toBe(2);
    expect(store.getState().session.conversations[0].messages?.map(m => m.content)).toEqual(['질문', '재시도 답변']);
    expect(store.getState().chatErrors['ai-001']).toBeNull();
  });

  it('restores an interrupted send without calling the model, then allows an explicit retry', async () => {
    const transport = vi.fn(async () => ({ reply: '복원된 답변', model: 'test' }));
    const raw = JSON.stringify({ ...saved, conversations: [{ ...saved.conversations[0], messages: [{ id: 'pending', role: 'user', content: '중단된 질문', createdAt: 101, status: 'pending' }] }] });
    const { store } = await setup(transport, raw);
    expect(transport).not.toHaveBeenCalled();
    await store.getState().retryMessage('ai-001');
    expect(transport).toHaveBeenCalledTimes(1);
    expect(store.getState().session.conversations[0].messages).toHaveLength(2);
  });

  it('keeps all local messages while sending only bounded recent completed context', async () => {
    const requests: ChatRequest[] = [];
    const { store } = await setup(async body => { requests.push(body); return { reply: '가'.repeat(600), model: 'test' }; });
    for (let i = 0; i < 6; i++) await store.getState().sendMessage('ai-001', `질문 ${i}`);
    const messages = requests.at(-1)!.messages;
    expect(messages.length).toBeLessThanOrEqual(8);
    expect(messages.reduce((sum, m) => sum + m.content.length, 0)).toBeLessThanOrEqual(3000);
    expect(messages.at(-1)?.content).toBe('질문 5');
    expect(store.getState().session.conversations[0].messages).toHaveLength(12);
  });

  it('blocks model requests when saved data could not be loaded', async () => {
    const transport = vi.fn(async () => ({ reply: '답변', model: 'test' }));
    const { store } = await setup(transport, '{broken');
    expect(await store.getState().sendMessage('ai-001', '질문')).toBe(false);
    expect(transport).not.toHaveBeenCalled();
  });
});
