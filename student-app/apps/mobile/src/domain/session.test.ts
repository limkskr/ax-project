import { describe, expect, it } from 'vitest';
import { validateProfile } from './profile';
import { emptySession, openConversation, readPersistedSession } from './session';
import type { ProfileInput, SessionData } from './types';
const profile: ProfileInput = { name: '금오인', studentNumber: '20261001', grade: '2', unitId: 'computing', programId: 'ai' };
describe('profile validation', () => {
  it('requires basic info without inventing an exact student-number length', () => {
    expect(validateProfile({ ...profile, name: '   ', studentNumber: 'ab12' })).toEqual({
      name: '이름을 입력해 주세요.', studentNumber: '학번은 숫자로 입력해 주세요.'
    });
    expect(validateProfile({ ...profile, studentNumber: '01234' })).toEqual({});
  });
  it('rejects a major from a different faculty', () => {
    expect(validateProfile({ ...profile, programId: 'environment' }).programId).toBeTruthy();
  });
  it('requires a deliberate selection but accepts an undeclared major', () => {
    expect(validateProfile({ ...profile, programId: undefined }).programId).toBeTruthy();
    expect(validateProfile({ ...profile, programId: null })).toEqual({});
    expect(validateProfile({ ...profile, unitId: 'undeclared', programId: null })).toEqual({});
  });
  it('does not allow a general-education unit as the student major', () => {
    expect(validateProfile({ ...profile, unitId: 'general', programId: null }).unitId).toBeTruthy();
  });
});
describe('one window per professor', () => {
  it('reopens an existing professor window without changing the saved student major', () => {
    const state = { ...emptySession('student-a'), profile: { ...profile, programId: 'ai' } };
    const once = openConversation(state, 'computer-011', 'window-a', 100);
    const again = openConversation(once, 'computer-011', 'window-b', 200);
    expect(again.conversations).toEqual([{ id: 'window-a', professorId: 'computer-011', createdAt: 100, lastOpenedAt: 200 }]);
    expect(again.profile?.programId).toBe('ai');
    expect(again.lastProfessorId).toBe('computer-011');
  });
  it('keeps two homonym professor windows separate', () => {
    const a = openConversation(emptySession('student-a'), 'environment-002', 'window-a', 100);
    const b = openConversation(a, 'electronics-019', 'window-b', 200);
    expect(b.conversations.map(c => c.professorId)).toEqual(['environment-002', 'electronics-019']);
  });
  it('does not create windows for an unknown professor ID', () => {
    const state = emptySession('student-a');
    expect(openConversation(state, 'missing-id', 'window-a', 100)).toEqual(state);
  });
});
describe('saved session restore', () => {
  it('restores the persisted profile and last opened professor', () => {
    const state = openConversation({ ...emptySession('student-a'), profile: { ...profile, programId: 'ai' } }, 'ai-001', 'window-a', 100);
    expect(readPersistedSession(JSON.stringify(state))).toEqual(state);
  });
  it('rejects corrupted or unsupported data instead of silently overwriting it', () => {
    expect(() => readPersistedSession('{broken')).toThrow();
    expect(() => readPersistedSession(JSON.stringify({ version: 2 }))).toThrow();
    expect(readPersistedSession(null)).toBeNull();
  });
  it('deduplicates restored professor windows and drops an invalid last selection', () => {
    const state: SessionData = { ...emptySession('student-a'), conversations: [
      { id: 'a', professorId: 'ai-001', createdAt: 100, lastOpenedAt: 100 },
      { id: 'b', professorId: 'ai-001', createdAt: 200, lastOpenedAt: 200 }
    ], lastProfessorId: 'unknown' };
    const restored = readPersistedSession(JSON.stringify(state));
    expect(restored?.conversations).toHaveLength(1);
    expect(restored?.lastProfessorId).toBeNull();
  });
});
