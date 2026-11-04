import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { ChatError, type ChatTransport } from '../domain/chat';
import { resolveApiUrl } from './api-url';
import { parseSources, parseSearchInfo } from '../domain/sources';

function apiUrl() {
  return resolveApiUrl({ platform: Platform.OS, hostUri: Constants.expoConfig?.hostUri,
    webHostname: typeof window !== 'undefined' ? window.location?.hostname : undefined,
    override: process.env.EXPO_PUBLIC_API_URL });
}
const errorMessages: Record<string, string> = {
  RATE_LIMIT: 'Groq 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요. 하루 한도라면 초기화 후 이용할 수 있어요.',
  BUSY: '다른 답변을 처리하고 있어요. 잠시 후 다시 시도해 주세요.',
  NOT_CONFIGURED: '서버의 Groq API 키를 설정해 주세요.', AUTH_ERROR: '서버의 Groq API 키 또는 접근 권한을 확인해 주세요.',
  TIMEOUT: '답변 시간이 길어지고 있어요. 다시 시도해 주세요.',
};
async function request(path: string, timeoutMs: number, body?: unknown) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl() + path, { method: body === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) throw new ChatError(errorMessages[data.error?.code] || 'AI 답변을 받지 못했어요. 잠시 후 다시 시도해 주세요.');
    return data;
  } catch (error) {
    if (error instanceof ChatError) throw error;
    throw new ChatError(controller.signal.aborted ? errorMessages.TIMEOUT : 'AI 서버에 연결하지 못했어요. 서버 실행과 네트워크를 확인해 주세요.');
  } finally { clearTimeout(timer); }
}
export const chatTransport: ChatTransport = async body => {
  const data = await request('/api/chat', 70000, body);
  if (typeof data.reply !== 'string' || !data.reply.trim() || typeof data.model !== 'string') throw new ChatError('AI 답변을 읽지 못했어요. 다시 시도해 주세요.');
  return { reply: data.reply, model: data.model,
    ...(data.sources !== undefined ? { sources: parseSources(data.sources) } : {}), ...(data.search !== undefined ? { search: parseSearchInfo(data.search) } : {}) };
};
export async function checkApiHealth(): Promise<boolean> {
  return (await request('/api/health', 5000)).configured === true;
}
