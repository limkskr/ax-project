import { getProfessor } from '../catalog';
import { validateProfile } from './profile';
import { parseSources, parseSearchInfo } from './sources';
import type { ChatMessage, Conversation, ProfileInput, SessionData, StudentProfile } from './types';
export function emptySession(userId: string): SessionData {
  return { version: 1, userId, profile: null, conversations: [], lastProfessorId: null };
}
export function openConversation(state: SessionData, professorId: string, id: string, now: number): SessionData {
  if (!getProfessor(professorId)) return state;
  const existing = state.conversations.find(window => window.professorId === professorId);
  const conversations = existing
    ? state.conversations.map(window => window.professorId === professorId ? { ...window, lastOpenedAt: now } : window)
    : [...state.conversations, { id, professorId, createdAt: now, lastOpenedAt: now }];
  return { ...state, conversations, lastProfessorId: professorId };
}
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
function invalid(): never { throw new Error('저장된 정보를 읽지 못했어요. 다시 시도해 주세요.'); }
export function readPersistedSession(raw: string | null): SessionData | null {
  if (raw === null) return null;
  const value: unknown = JSON.parse(raw);
  if (!object(value) || value.version !== 1 || typeof value.userId !== 'string' || !value.userId ||
    !Array.isArray(value.conversations)) return invalid();
  let profile: StudentProfile | null = null;
  if (value.profile !== null) {
    const p = value.profile;
    if (!object(p) || typeof p.name !== 'string' || typeof p.studentNumber !== 'string' ||
      typeof p.grade !== 'string' || typeof p.unitId !== 'string' ||
      !(p.programId === null || typeof p.programId === 'string')) return invalid();
    if (Object.keys(validateProfile(p as ProfileInput)).length) return invalid();
    profile = { name: p.name, studentNumber: p.studentNumber, grade: p.grade, unitId: p.unitId, programId: p.programId };
  }
  const conversations: Conversation[] = [];
  for (const row of value.conversations) {
    if (!object(row) || typeof row.id !== 'string' || !row.id || typeof row.professorId !== 'string' ||
      typeof row.createdAt !== 'number' || !Number.isFinite(row.createdAt) ||
      typeof row.lastOpenedAt !== 'number' || !Number.isFinite(row.lastOpenedAt)) return invalid();
    if (!getProfessor(row.professorId)) continue;
    let messages: ChatMessage[] | undefined;
    if (row.messages !== undefined) {
      if (!Array.isArray(row.messages)) return invalid();
      const ids = new Set<string>();
      messages = row.messages.map(message => {
        if (!object(message) || typeof message.id !== 'string' || !message.id || ids.has(message.id) ||
          !['user', 'assistant'].includes(String(message.role)) || typeof message.content !== 'string' || !message.content.trim() ||
          typeof message.createdAt !== 'number' || !Number.isFinite(message.createdAt) ||
          !['pending', 'complete', 'failed'].includes(String(message.status)) ||
          (message.role === 'assistant' && message.status !== 'complete')) return invalid();
        ids.add(message.id);
        return { id: message.id, role: message.role as ChatMessage['role'], content: message.content, createdAt: message.createdAt,
          status: message.status === 'pending' ? 'failed' : message.status as ChatMessage['status'],
          ...(message.role === 'assistant' && message.sources !== undefined ? { sources: parseSources(message.sources) } : {}),
          ...(message.role === 'assistant' && message.search !== undefined ? { search: parseSearchInfo(message.search) } : {}) };
      });
    }
    const existing = conversations.find(window => window.professorId === row.professorId);
    if (existing) existing.lastOpenedAt = Math.max(existing.lastOpenedAt, row.lastOpenedAt);
    else conversations.push({ id: row.id, professorId: row.professorId, createdAt: row.createdAt, lastOpenedAt: row.lastOpenedAt,
      ...(messages !== undefined ? { messages } : {}) });
  }
  const lastProfessorId = typeof value.lastProfessorId === 'string' &&
    conversations.some(window => window.professorId === value.lastProfessorId) ? value.lastProfessorId : null;
  return { version: 1, userId: value.userId, profile, conversations, lastProfessorId };
}
