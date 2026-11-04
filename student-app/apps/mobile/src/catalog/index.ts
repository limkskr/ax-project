import raw from './catalog.json';
import type { AcademicUnit, Professor } from '../domain/types';
export const units = raw.units as AcademicUnit[];
export const professors = raw.professors as Professor[];
export const checkedAt = raw.checkedAt;
export const getUnit = (id: string) => units.find(unit => unit.id === id);
export const getProfessor = (id: string) => professors.find(professor => professor.id === id);
export type ProfessorFilter = { unitId?: string; programId?: string; query?: string; includeEmeritus?: boolean };
const normalize = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, '');
export function getProfessors(filter: ProfessorFilter = {}): Professor[] {
  const query = normalize(filter.query ?? '');
  return professors.filter(professor =>
    (!professor.isEmeritus || filter.includeEmeritus) &&
    professor.memberships.some(m =>
      (!filter.unitId || m.unitId === filter.unitId) &&
      (!filter.programId || m.programId === filter.programId || m.browseProgramIds?.includes(filter.programId))
    ) && (!query || normalize(professor.name + getProfessorLabel(professor)).includes(query))
  );
}
export function getProfessorLabel(professor: Professor): string {
  const labels = professor.memberships.map(m => {
    const unit = getUnit(m.unitId);
    return unit?.programs.find(program => program.id === m.programId)?.name ??
      (m.kind === 'faculty' ? '건축학·건축공학 학부 공통' : unit?.name);
  }).filter((name): name is string => !!name);
  return [...new Set(labels)].join(' · ');
}
export function getProfileLabel(unitId: string, programId: string | null): string {
  const unit = getUnit(unitId);
  return unit?.programs.find(program => program.id === programId)?.name ??
    (unit?.programs.length ? unit.name + ' · 전공 미정' : unit?.name ?? '');
}
