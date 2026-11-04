export type Program = { id: string; name: string };
export type AcademicUnit = {
  id: string; name: string; studentSelectable: boolean;
  rosterStatus: 'confirmed' | 'partial' | 'pending';
  programs: Program[]; sourceUrl: string;
};
export type Membership = {
  unitId: string; programId: string | null;
  kind: 'primary' | 'adjunct' | 'advising' | 'faculty' | 'listed' | 'emeritus';
  sourceUrl: string; checkedAt: string; browseProgramIds?: string[];
};
export type Professor = { id: string; name: string; isEmeritus: boolean; memberships: Membership[] };
export type StudentProfile = {
  name: string; studentNumber: string; grade: string; unitId: string; programId: string | null;
};
export type ProfileInput = Omit<StudentProfile, 'programId'> & { programId: string | null | undefined };
export type ProfileErrors = Partial<Record<keyof StudentProfile, string>>;
export type AnswerSource = {
  id: string; number: number; sourceId: string; title: string; url: string;
  scope: 'common' | 'program'; category: string; programIds: string[];
  publishedAt: string | null; fetchedAt: string; stale: boolean; limitations: string[];
};
export type SearchInfo = { status: 'grounded' | 'partial' | 'not_found'; sourceCount: number; notices: string[] };
export type ChatMessage = {
  id: string; role: 'user' | 'assistant'; content: string; createdAt: number;
  status: 'pending' | 'complete' | 'failed';
  sources?: AnswerSource[]; search?: SearchInfo;
};
export type Conversation = { id: string; professorId: string; createdAt: number; lastOpenedAt: number; messages?: ChatMessage[] };
export type SessionData = {
  version: 1; userId: string; profile: StudentProfile | null;
  conversations: Conversation[]; lastProfessorId: string | null;
};
