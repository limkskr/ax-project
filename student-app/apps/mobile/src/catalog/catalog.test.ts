import { describe, expect, it } from 'vitest';
import { getProfessors, getProfessor } from './index';
describe('professor selection identity', () => {
  it('selects the same professor ID in computer and AI memberships', () => {
    const computer = getProfessors({ programId: 'computer' }).find(p => p.name === '최동수');
    const ai = getProfessors({ programId: 'ai' }).find(p => p.name === '최동수');
    expect(computer?.id).toBe('computer-011');
    expect(ai?.id).toBe('computer-011');
  });
  it('keeps same-name professors distinct across departments', () => {
    const environment = getProfessors({ programId: 'environment', query: '이승환' });
    const electronics = getProfessors({ programId: 'electronic-system', query: '이승환' });
    expect(environment.map(p => p.id)).toEqual(['environment-002']);
    expect(electronics.map(p => p.id)).toEqual(['electronics-019']);
  });
  it('exposes unconfirmed architecture names as shared faculty, without invented program membership', () => {
    expect(getProfessors({ programId: 'architecture' }).some(p => p.name === '안동준')).toBe(true);
    expect(getProfessor('architecture-001')?.memberships.some(m => m.programId === 'architecture')).toBe(false);
    expect(getProfessors({ programId: 'civil' }).some(p => p.name === '안동준')).toBe(false);
  });
  it('finds names despite whitespace and leaves pending rosters empty', () => {
    expect(getProfessors({ unitId: 'computing', query: ' 김 지 형 ' }).map(p => p.name)).toEqual(['김지형']);
    expect(getProfessors({ unitId: 'ax' })).toEqual([]);
  });
  it('does not present emeritus teachers as current unless requested', () => {
    expect(getProfessors({ programId: 'computer' }).some(p => p.name === '장춘서')).toBe(false);
    expect(getProfessors({ programId: 'computer', includeEmeritus: true }).some(p => p.name === '장춘서')).toBe(true);
  });
});
