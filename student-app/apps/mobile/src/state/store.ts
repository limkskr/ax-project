import { repository } from '../storage/repository';
import { createSessionStore } from './session-store';
import { chatTransport } from '../services/chat-client';

export const useAppStore = createSessionStore(repository, chatTransport);
