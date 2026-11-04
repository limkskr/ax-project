import { PublicError } from './errors.mjs';

export async function requestGroq(config, messages, fetchImpl, signal) {
  const response = await fetchImpl('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { Authorization: `Bearer ${config.apiKey}`, 'Content-Type': 'application/json' }, signal,
    body: JSON.stringify({ model: config.model, messages, reasoning_effort: 'none',
      max_completion_tokens: 512, temperature: 0.7, stream: false }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    if (response.status === 429) throw new PublicError(429, 'RATE_LIMIT', 'Groq 사용 한도에 도달했어요. 잠시 후 다시 시도해 주세요. 하루 한도라면 초기화 후 이용할 수 있어요.');
    if ([401, 403].includes(response.status)) throw new PublicError(503, 'AUTH_ERROR', '서버의 Groq API 키 또는 접근 권한을 확인해 주세요.');
    throw new PublicError(502, 'PROVIDER_ERROR', 'AI 서비스가 응답하지 못했어요. 잠시 후 다시 시도해 주세요.');
  }
  const data = await response.json(); const message = data.choices?.[0]?.message;
  if (!message || typeof message.content !== 'string' ||
    JSON.stringify(message).includes(config.apiKey)) throw new PublicError(502, 'PROVIDER_ERROR', 'AI 답변을 받지 못했어요. 다시 시도해 주세요.');
  return message;
}
