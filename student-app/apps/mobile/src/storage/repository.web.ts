import type { SessionData } from '../domain/types';
const key = 'kit-professor-ai-session-v1';
export const repository = {
  async read(): Promise<string | null> { return typeof window === 'undefined' ? null : window.localStorage.getItem(key); },
  async write(session: SessionData): Promise<void> {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, JSON.stringify(session));
  }
};
