import { describe, expect, it } from 'vitest';
import { parseSources, parseSearchInfo } from './sources';
import { readPersistedSession, emptySession, openConversation } from './session';
import { createSessionStore } from '../state/session-store';
import { buildChatRequest } from './chat';
import type { StudentProfile } from './types';

const source = { id: 'kit.calendar:1', number: 1, sourceId: 'kit.calendar', title: '2026년 기말시험', url: 'https://www.kumoh.ac.kr/ko/schedule.do?srYear=2026',
  scope: 'common', category: 'calendar', programIds: [], publishedAt: null, fetchedAt: '2026-10-05T00:00:00.000Z', stale: false, limitations: [] };
const profile: StudentProfile = { name: '테스트 이름', studentNumber: '20269999', grade: '2', unitId: 'computing', programId: 'ai' };
const search = { status: 'grounded', sourceCount: 1, notices: [] };

describe('official answer sources', () => {
  it('accepts official HTTPS metadata and excludes unsafe, credential-bearing or duplicate links', () => {
    expect(parseSources([source])).toEqual([source]);
    expect(parseSources([source, source])).toEqual([source]);
    for (const url of ['javascript:alert(1)', 'http://www.kumoh.ac.kr/ko/schedule.do', 'https://kumoh.ac.kr.evil.example/',
      'https://a:b@www.kumoh.ac.kr/ko/schedule.do', 'https://www.kumoh.ac.kr:444/ko/schedule.do']) expect(parseSources([{ ...source, url }])).toEqual([]);
    expect(parseSearchInfo({ status: 'made_up', notices: [] })).toBeUndefined();
  });

  it('persists and restores sources while excluding them and student identifiers from model requests', async () => {
    const session = openConversation({ ...emptySession('student'), profile }, 'ai-001', 'window', 1);
    let raw = JSON.stringify(session);
    const store = createSessionStore({ read: async () => raw, write: async value => { raw = JSON.stringify(value); } },
      async () => ({ reply: '기말시험은 12월 14~18일이에요. [1]', model: 'test', sources: parseSources([source]), search: parseSearchInfo(search) }));
    await store.getState().hydrate(); await store.getState().sendMessage('ai-001', '기말시험 일정 알려줘');
    const restored = readPersistedSession(raw)!;
    const history = restored.conversations[0].messages!;
    expect(history[1].sources).toEqual([source]); expect(history[1].search).toEqual(search);
    const request = JSON.stringify(buildChatRequest('ai-001', profile, history));
    expect(request).not.toContain('sourceId'); expect(request).not.toContain(profile.studentNumber); expect(request).not.toContain(profile.name);
  });

  it('keeps older messages readable and drops malformed optional source metadata without erasing the conversation', () => {
    const session = openConversation(emptySession('student'), 'ai-001', 'window', 1);
    session.conversations[0].messages = [{ id: 'old', role: 'assistant', content: '예전 답변', createdAt: 1, status: 'complete' }];
    expect(readPersistedSession(JSON.stringify(session))?.conversations[0].messages).toEqual(session.conversations[0].messages);
    const raw = { ...session, conversations: [{ ...session.conversations[0], messages: [{ ...session.conversations[0].messages[0], sources: [{ ...source, url: 'javascript:bad' }] }] }] };
    expect(readPersistedSession(JSON.stringify(raw))?.conversations[0].messages?.[0].sources).toEqual([]);
  });
});
