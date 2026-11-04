import type { AnswerSource, SearchInfo } from './types';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown, max: number): value is string => typeof value === 'string' && !!value.trim() && value.length <= max;
function officialUrl(value: unknown): value is string {
  if (!text(value, 2048)) return false;
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname.endsWith('.kumoh.ac.kr') && !url.username && !url.password && !url.port; }
  catch { return false; }
}
export function parseSources(value: unknown): AnswerSource[] {
  if (!Array.isArray(value)) return [];
  const result: AnswerSource[] = []; const ids = new Set<string>(); const numbers = new Set<number>();
  for (const row of value.slice(0, 12)) {
    if (!object(row) || !text(row.id, 160) || ids.has(row.id) || typeof row.number !== 'number' || !Number.isInteger(row.number) || row.number < 1 || row.number > 24 || numbers.has(row.number) ||
      !text(row.sourceId, 100) || !text(row.title, 500) || !officialUrl(row.url) || !['common', 'program'].includes(String(row.scope)) || !text(row.category, 50) ||
      !text(row.fetchedAt, 50) || !Number.isFinite(Date.parse(row.fetchedAt))) continue;
    ids.add(row.id); numbers.add(row.number);
    result.push({ id: row.id, number: row.number, sourceId: row.sourceId, title: row.title, url: row.url, scope: row.scope as AnswerSource['scope'],
      category: row.category, programIds: Array.isArray(row.programIds) ? row.programIds.filter((id): id is string => text(id, 80)).slice(0, 12) : [],
      publishedAt: text(row.publishedAt, 50) && Number.isFinite(Date.parse(row.publishedAt)) ? row.publishedAt : null,
      fetchedAt: row.fetchedAt, stale: row.stale === true,
      limitations: Array.isArray(row.limitations) ? row.limitations.filter((line): line is string => text(line, 300)).slice(0, 5) : [] });
  }
  return result;
}
export function parseSearchInfo(value: unknown): SearchInfo | undefined {
  if (!object(value) || !['grounded', 'partial', 'not_found'].includes(String(value.status)) || typeof value.sourceCount !== 'number' || !Number.isInteger(value.sourceCount) || value.sourceCount < 0 || value.sourceCount > 100) return undefined;
  return { status: value.status as SearchInfo['status'], sourceCount: value.sourceCount,
    notices: Array.isArray(value.notices) ? value.notices.filter((line): line is string => text(line, 300)).slice(0, 5) : [] };
}
