import { create } from 'zustand';
import { emptySession, openConversation, readPersistedSession } from '../domain/session';
import { validateProfile } from '../domain/profile';
import { getProfessor } from '../catalog';
import { buildChatRequest, ChatError, type ChatTransport } from '../domain/chat';
import type { ChatMessage, SessionData, StudentProfile } from '../domain/types';
const newId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 12);
export type AppStore = {
  session: SessionData; ready: boolean; hydrating: boolean; loadFailed: boolean; storageError: string | null;
  hydrate(): Promise<void>; saveProfile(profile: StudentProfile): Promise<boolean>;
  selectProfessor(professorId: string): Promise<void>; retrySave(): Promise<void>;
  pendingByProfessor: Record<string, boolean>; chatErrors: Record<string, string | null>;
  sendMessage(professorId: string, content: string): Promise<boolean>;
  retryMessage(professorId: string): Promise<void>;
};
export type SessionRepository = {
  read(): Promise<string | null>;
  write(session: SessionData): Promise<void>;
};
export function createSessionStore(repository: SessionRepository, transport?: ChatTransport) {
  let queue = Promise.resolve();
  return create<AppStore>((set, get) => {
    async function persist(session: SessionData): Promise<boolean> {
      const operation = queue.catch(() => {}).then(() => repository.write(session));
      queue = operation;
      try {
        await operation;
        if (get().session === session) set({ storageError: null });
        return true;
      } catch {
        set({ storageError: '기기에 저장하지 못했어요. 다시 시도해 주세요.' });
        return false;
      }
    }
    const canSend = (professorId: string) => {
      const state = get();
      return !!transport && state.ready && !state.hydrating && !state.loadFailed && !!state.session.profile &&
        !!getProfessor(professorId) && !state.pendingByProfessor[professorId] &&
        state.session.conversations.some(window => window.professorId === professorId);
    };
    const updateHistory = (professorId: string, change: (messages: ChatMessage[]) => ChatMessage[]) => {
      const session = { ...get().session, conversations: get().session.conversations.map(window =>
        window.professorId === professorId ? { ...window, messages: change(window.messages || []) } : window) };
      set({ session });
      return session;
    };
    async function requestReply(professorId: string, messageId: string) {
      const snapshot = get().session;
      const history = snapshot.conversations.find(window => window.professorId === professorId)!.messages!;
      const request = buildChatRequest(professorId, snapshot.profile!, history);
      try {
        if (!await persist(snapshot)) throw new ChatError('질문을 기기에 저장하지 못했어요. 저장 문제를 해결한 후 다시 보내 주세요.');
        const answer = await transport!(request);
        const completed = updateHistory(professorId, messages => [
          ...messages.map(message => message.id === messageId ? { ...message, status: 'complete' as const } : message),
          { id: newId(), role: 'assistant', content: answer.reply, createdAt: Date.now(), status: 'complete',
            ...(answer.sources ? { sources: answer.sources } : {}), ...(answer.search ? { search: answer.search } : {}) },
        ]);
        await persist(completed);
      } catch (error) {
        const failed = updateHistory(professorId, messages => messages.map(message => message.id === messageId ? { ...message, status: 'failed' } : message));
        set({ chatErrors: { ...get().chatErrors, [professorId]: error instanceof ChatError ? error.message : '답변을 받지 못했어요. 다시 시도해 주세요.' } });
        await persist(failed);
      } finally { set({ pendingByProfessor: { ...get().pendingByProfessor, [professorId]: false } }); }
    }
    return {
      session: emptySession(newId()), ready: false, hydrating: false, loadFailed: false, storageError: null,
      pendingByProfessor: {}, chatErrors: {},
      async hydrate() {
        if (get().hydrating || get().ready) return;
        set({ hydrating: true });
        try {
          const restored = readPersistedSession(await repository.read());
          if (restored) set({ session: restored });
          set({ ready: true, hydrating: false, loadFailed: false, storageError: null });
        } catch {
          set({ ready: true, hydrating: false, loadFailed: true, storageError: '저장된 정보를 불러오지 못했어요. 다시 불러온 후 진행해 주세요.' });
        }
      },
      async saveProfile(profile) {
        if (!get().ready || get().hydrating || get().loadFailed || Object.keys(validateProfile(profile)).length) return false;
        const session = { ...get().session, profile: { ...profile, name: profile.name.trim(), studentNumber: profile.studentNumber.trim() } };
        set({ session });
        return persist(session);
      },
      async selectProfessor(professorId) {
        if (!get().ready || get().hydrating || get().loadFailed) return;
        const session = openConversation(get().session, professorId, newId(), Date.now());
        if (session === get().session) return;
        set({ session });
        await persist(session);
      },
      async sendMessage(professorId, content) {
        const text = content.trim();
        if (!canSend(professorId) || !text || text.length > 2000) return false;
        const message: ChatMessage = { id: newId(), role: 'user', content: text, createdAt: Date.now(), status: 'pending' };
        set({ pendingByProfessor: { ...get().pendingByProfessor, [professorId]: true }, chatErrors: { ...get().chatErrors, [professorId]: null } });
        updateHistory(professorId, messages => [...messages, message]);
        await requestReply(professorId, message.id);
        return true;
      },
      async retryMessage(professorId) {
        if (!canSend(professorId)) return;
        const latest = get().session.conversations.find(window => window.professorId === professorId)?.messages?.at(-1);
        if (latest?.role !== 'user' || latest.status !== 'failed') return;
        set({ pendingByProfessor: { ...get().pendingByProfessor, [professorId]: true }, chatErrors: { ...get().chatErrors, [professorId]: null } });
        updateHistory(professorId, messages => messages.map(message => message.id === latest.id ? { ...message, status: 'pending' } : message));
        await requestReply(professorId, latest.id);
      },
      async retrySave() {
        if (get().hydrating) return;
        if (get().loadFailed || !get().ready) {
          set({ ready: false, storageError: null });
          await get().hydrate();
        } else await persist(get().session);
      }
    };
  });
}
