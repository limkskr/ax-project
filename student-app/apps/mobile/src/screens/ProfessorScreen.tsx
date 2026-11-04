import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronRight, UserRound } from 'lucide-react-native';
import { Brand, Steps } from '../components/Brand';
import { ProfessorDirectory } from '../components/ProfessorDirectory';
import { useAppStore } from '../state/store';
import { colors, fonts } from '../theme';

export default function ProfessorScreen() {
  const { session, selectProfessor } = useAppStore();
  const { width } = useWindowDimensions();
  const profile = session.profile;
  if (!profile) return <Redirect href="/profile" />;
  async function open(professorId: string) {
    await selectProfessor(professorId);
    router.push({ pathname: '/chat/[professorId]', params: { professorId } });
  }
  return <SafeAreaView style={styles.page}>
    <View style={styles.top}><View style={[styles.topInner, width < 560 && { minHeight: 76 }]}><Brand />
      {width >= 760 && <Steps current={2} />}
      <Pressable accessibilityRole="button" accessibilityLabel="내 기본정보 수정" onPress={() => router.push({ pathname: '/profile', params: { edit: '1' } })} style={styles.profileButton}>
        <UserRound size={16} color={colors.muted} /><Text style={styles.profileName}>{profile.name}</Text>{width >= 500 && <ChevronRight size={14} color={colors.muted} />}
      </Pressable></View></View>
    <ProfessorDirectory profile={profile} onSelect={open} addedProfessorIds={session.conversations.map(conversation => conversation.professorId)} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  top: { backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: colors.border, paddingHorizontal: 24 },
  topInner: { width: '100%', maxWidth: 1120, alignSelf: 'center', minHeight: 88, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 15 },
  profileButton: { flexDirection: 'row', gap: 8, alignItems: 'center', padding: 11, borderRadius: 10, backgroundColor: colors.background },
  profileName: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink }
});
