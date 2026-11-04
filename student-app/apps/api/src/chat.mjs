import { readFileSync } from 'node:fs';
import { PublicError } from './errors.mjs';
import { requestGroq } from './groq.mjs';
import { analyzeChatIntent } from './chat-intent.mjs';
export { PublicError } from './errors.mjs';

const catalog = JSON.parse(readFileSync(new URL('../../mobile/src/catalog/catalog.json', import.meta.url), 'utf8'));
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const only = (value, keys) => object(value) && Object.keys(value).every(key => keys.includes(key));

const invalid = () => { throw new PublicError(400, 'INVALID_REQUEST', '질문과 전공 정보를 확인해 주세요. 질문은 2,000자까지 보낼 수 있어요.'); };

export function prepareChat(value) {
  if (!only(value, ['professorId', 'academicContext', 'messages'])) return invalid();
  const professor = catalog.professors.find(row => row.id === value.professorId);
  const context = value.academicContext;
  if (!professor || !only(context, ['grade', 'unitId', 'programId']) || !['1', '2', '3', '4', '5+'].includes(context.grade)) return invalid();
  const unit = catalog.units.find(row => row.id === context.unitId && row.studentSelectable);
  const program = unit?.programs.find(row => row.id === context.programId);
  if (!unit || (context.programId !== null && !program) || (unit.programs.length === 1 && !program)) return invalid();
  if (!Array.isArray(value.messages) || !value.messages.length || value.messages.length > 100) return invalid();
  const messages = value.messages.map(row => {
    if (!only(row, ['role', 'content']) || !['user', 'assistant'].includes(row.role) ||
      typeof row.content !== 'string' || !row.content.trim() || row.content.length > 8000) return invalid();
    return { role: row.role, content: row.content.trim() };
  });
  const latest = messages.at(-1);
  if (latest.role !== 'user' || latest.content.length > 2000) return invalid();
  const recent = [latest];
  let length = latest.content.length;
  for (let i = messages.length - 2; i >= 0 && recent.length < 8; i--) {
    if (length + messages[i].content.length > 3000) break;
    recent.unshift(messages[i]); length += messages[i].content.length;
  }
  while (recent[0].role === 'assistant') recent.shift();
  const majors = [...new Set(professor.memberships.map(membership => {
    const memberUnit = catalog.units.find(row => row.id === membership.unitId);
    return memberUnit?.programs.find(row => row.id === membership.programId)?.name || memberUnit?.name;
  }).filter(Boolean))].join(', ');
  const system = `당신은 금오공과대학교 학생을 돕는 가상 교수AI 캐릭터입니다. 표시 이름은 ${professor.name} 교수AI이고 전공 분야는 ${majors}입니다. 실제 교수 본인이 아니며 실제 교수의 개인적 의견·약속을 대신하지 않습니다. 학생의 전공은 ${unit.name} ${program?.name || '전공 미정'}, 학년은 ${context.grade}입니다. 한국어로 친절하고 간결하게 설명하세요. 현재 공식 자료 검색과 데이터베이스는 연결되어 있지 않습니다. 학교 정보를 조회했다고 말하거나 확인하지 않은 날짜·요건·출처를 만들어내지 마세요. 학사일정, 졸업요건, 성적, 시험, 수강 및 공지의 구체적인 내용은 공식 근거를 확인한 경우에만 안내하세요. 일반 학습 질문에는 이해하기 쉬운 예시로 답하세요.`;
  return { messages: [{ role: 'system', content: system }, ...recent] };
}

export async function completeChat(config, prepared, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const messages = [...(prepared.messages || prepared)];
    const query = analyzeChatIntent(messages);
    if (query.academic) return {
      reply: '현재 학교 공식 자료가 연결되어 있지 않아 질문하신 학사정보를 확인할 수 없습니다. 학교 공식 홈페이지에서 확인해 주세요. 일반 학습 질문은 도와드릴 수 있어요.',
      model: 'knowledge-not-connected', sources: [],
    };
    if (!config.apiKey) throw new PublicError(503, 'NOT_CONFIGURED', '서버의 Groq API 키를 설정해 주세요.');
    const result = await requestGroq(config, messages, fetchImpl, controller.signal);
    if (!result.content?.trim()) throw new PublicError(502, 'PROVIDER_ERROR', 'AI 답변을 받지 못했어요. 다시 시도해 주세요.');
    return { reply: result.content.trim(), model: config.model };
  } catch (error) {
    if (error instanceof PublicError) throw error;
    if (controller.signal.aborted) throw new PublicError(504, 'TIMEOUT', '답변 시간이 길어지고 있어요. 다시 시도해 주세요.');
    throw new PublicError(502, 'PROVIDER_ERROR', 'AI 서비스에 연결하지 못했어요. 네트워크를 확인하고 다시 시도해 주세요.');
  } finally { clearTimeout(timer); }
}
