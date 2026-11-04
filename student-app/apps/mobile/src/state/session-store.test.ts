import { describe, expect, it } from 'vitest';
import { emptySession, openConversation } from '../domain/session';
import type { SessionData, StudentProfile } from '../domain/types';
import { createSessionStore } from './session-store';

const profile: StudentProfile = { name: '금오인', studentNumber: '20260001', grade: '2', unitId: 'computing', programId: 'ai' };
const saved = openConversation({ ...emptySession('original-student'), profile }, 'ai-001', 'original-window', 100);

describe('session persistence recovery', () => {
  it('blocks writes after a read failure and restores the original window on retry', async () => {
    const writes: SessionData[] = [];
    let reads = 0;
    const store = createSessionStore({
      async read() { if (++reads === 1) throw new Error('temporary read failure'); return JSON.stringify(saved); },
      async write(session) { writes.push(session); }
    });
    await store.getState().hydrate();
    const accepted = await store.getState().saveProfile({ ...profile, name: '새 이름' });
    await store.getState().selectProfessor('computer-011');
    expect(accepted).toBe(false);
    expect(writes).toEqual([]);
    await store.getState().retrySave();
    expect(store.getState().session).toEqual(saved);
    expect(store.getState().storageError).toBeNull();
    await store.getState().selectProfessor('ai-001');
    expect(writes[0].conversations[0].id).toBe('original-window');
  });

  it('does not overwrite corrupted persisted data with a fresh profile', async () => {
    let persisted = '{broken';
    const store = createSessionStore({
      async read() { return persisted; },
      async write(session) { persisted = JSON.stringify(session); }
    });
    await store.getState().hydrate();
    expect(await store.getState().saveProfile(profile)).toBe(false);
    expect(persisted).toBe('{broken');
  });

  it('blocks writes while the initial read is pending', async () => {
    let finishRead!: (value: string | null) => void;
    const pendingRead = new Promise<string | null>(resolve => { finishRead = resolve; });
    const writes: SessionData[] = [];
    const store = createSessionStore({
      read: () => pendingRead,
      async write(session) { writes.push(session); }
    });
    const hydration = store.getState().hydrate();
    expect(await store.getState().saveProfile(profile)).toBe(false);
    expect(writes).toEqual([]);
    finishRead(JSON.stringify(saved));
    await hydration;
    expect(store.getState().session).toEqual(saved);
  });
});
