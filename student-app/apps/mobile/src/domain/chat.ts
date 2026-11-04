import type { AnswerSource, ChatMessage, SearchInfo, StudentProfile } from './types';

export type ChatRequest = {
  professorId: string;
  academicContext: Pick<StudentProfile, 'grade' | 'unitId' | 'programId'>;
  messages: { role: 'user' | 'assistant'; content: string }[];
};
export type ChatTransport = (request: ChatRequest) => Promise<{ reply: string; model: string; sources?: AnswerSource[]; search?: SearchInfo }>;

export function buildChatRequest(professorId: string, profile: StudentProfile, history: ChatMessage[]): ChatRequest {
  const eligible = history.filter(message => message.status !== 'failed');
  const recent: ChatRequest['messages'] = [];
  let length = 0;
  for (let i = eligible.length - 1; i >= 0 && recent.length < 8; i--) {
    if (length + eligible[i].content.length > 3000) break;
    recent.unshift({ role: eligible[i].role, content: eligible[i].content });
    length += eligible[i].content.length;
  }
  while (recent[0]?.role === 'assistant') recent.shift();
  return { professorId, academicContext: { grade: profile.grade, unitId: profile.unitId, programId: profile.programId }, messages: recent };
}

// Network clients expose only controlled Korean errors. Arbitrary errors are not rendered.
export class ChatError extends Error {}
