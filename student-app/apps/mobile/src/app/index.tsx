import { Redirect } from 'expo-router';
import { useAppStore } from '../state/store';
export default function Index() {
  const { session } = useAppStore();
  if (!session.profile) return <Redirect href="/profile" />;
  if (session.lastProfessorId) return <Redirect href={{ pathname: '/chat/[professorId]', params: { professorId: session.lastProfessorId } }} />;
  return <Redirect href="/professors" />;
}
