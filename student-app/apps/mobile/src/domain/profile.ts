import { getUnit } from '../catalog';
import type { ProfileErrors, ProfileInput } from './types';
export function validateProfile(profile: ProfileInput): ProfileErrors {
  const errors: ProfileErrors = {};
  if (!profile.name.trim()) errors.name = '이름을 입력해 주세요.';
  else if (profile.name.trim().length > 40) errors.name = '이름은 40자 이내로 입력해 주세요.';
  if (!/^\d+$/.test(profile.studentNumber.trim())) errors.studentNumber = '학번은 숫자로 입력해 주세요.';
  if (!['1', '2', '3', '4', '5+'].includes(profile.grade)) errors.grade = '학년을 선택해 주세요.';
  const unit = getUnit(profile.unitId);
  if (!unit?.studentSelectable) errors.unitId = '학부·학과를 선택해 주세요.';
  else if (profile.programId === undefined ||
    (profile.programId !== null && !unit.programs.some(program => program.id === profile.programId)) ||
    (unit.programs.length === 1 && profile.programId !== unit.programs[0].id)) {
    errors.programId = '해당 학부의 전공을 선택해 주세요.';
  }
  return errors;
}
