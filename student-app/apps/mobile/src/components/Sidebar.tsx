import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Plus, X } from 'lucide-react-native';
import { Brand } from './Brand';
import { ProfessorAvatar } from './ProfessorAvatar';
import { getProfileLabel, getProfessor, getProfessorLabel } from '../catalog';
import { useAppStore } from '../state/store';
import { colors, fonts } from '../theme';

export function Sidebar({ activeProfessorId, onClose, onFindProfessor }: { activeProfessorId: string; onClose?: () => void; onFindProfessor(): void }) {
  const { session, selectProfessor } = useAppStore();
  const windows = [...session.conversations].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
  async function choose(professorId: string) {
    await selectProfessor(professorId);
    onClose?.();
    router.replace({ pathname: '/chat/[professorId]', params: { professorId } });
  }
  return <View style={styles.sidebar}>
    <View style={styles.brandRow}><Brand compact />
      {onClose && <Pressable accessibilityRole="button" accessibilityLabel="교수 목록 닫기" onPress={onClose} style={styles.close}><X size={20} color={colors.muted} /></Pressable>}</View>
    <Pressable accessibilityRole="button" accessibilityLabel="다른 교수 찾기" onPress={onFindProfessor} style={({ pressed }) => [styles.find, pressed && { backgroundColor: '#EDF2FF' }]}>
      <Plus size={17} color={colors.blue} /><Text style={styles.findText}>다른 교수 찾기</Text>
    </Pressable>
    <View style={styles.labelRow}><Text style={styles.sectionLabel}>선택한 교수</Text><Text style={styles.count}>{windows.length}</Text></View>
    <ScrollView contentContainerStyle={styles.list}>
      {windows.map(window => {
        const professor = getProfessor(window.professorId);
        if (!professor) return null;
        const active = professor.id === activeProfessorId;
        return <Pressable key={window.id} accessibilityRole="button" accessibilityLabel={professor.name + ' 교수 AI 선택'} accessibilityState={{ selected: active }}
          onPress={() => void choose(professor.id)} style={({ pressed }) => [styles.item, active && styles.activeItem, pressed && { opacity: 0.75 }]}>
          <ProfessorAvatar professor={professor} size={35} />
          <View style={{ flex: 1 }}><Text numberOfLines={1} style={[styles.itemName, active && { color: colors.blue }]}>{professor.name} 교수 AI</Text>
            <Text numberOfLines={1} style={styles.itemSub}>{getProfessorLabel(professor)}</Text></View>
          {active && <View style={styles.activeDot} />}
        </Pressable>;
      })}
    </ScrollView>
    <View style={styles.bottom}>
      <View style={styles.note}><View style={styles.noteDot} /><Text style={styles.noteText}>교수별 대화는 이 기기에 저장돼요</Text></View>
      <Pressable accessibilityRole="button" accessibilityLabel="내 기본정보 수정" onPress={() => { onClose?.(); router.push({ pathname: '/profile', params: { edit: '1' } }); }} style={styles.profile}>
        <View style={styles.initial}><Text style={styles.initialText}>{session.profile?.name.charAt(0)}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.profileName}>{session.profile?.name}</Text><Text numberOfLines={1} style={styles.profileMajor}>
          {session.profile ? getProfileLabel(session.profile.unitId, session.profile.programId) : ''}
        </Text></View><ChevronRight size={16} color="#9AA5B7" />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  sidebar: { flex: 1, backgroundColor: '#F3F5FA', paddingTop: 26 },
  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -12 },
  find: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 20, marginTop: 30, borderWidth: 1, borderColor: '#DBE3F5', backgroundColor: '#FFFFFF', minHeight: 47, paddingHorizontal: 15, borderRadius: 11 },
  findText: { fontFamily: fonts.medium, fontSize: 12, color: colors.blue },
  labelRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginHorizontal: 25, marginTop: 33, marginBottom: 12 },
  sectionLabel: { fontFamily: fonts.medium, color: '#8591A7', fontSize: 10 },
  count: { fontFamily: fonts.medium, color: '#94A0B6', fontSize: 9, backgroundColor: '#E7EBF3', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 5 },
  list: { paddingHorizontal: 12, gap: 5 },
  item: { minHeight: 68, flexDirection: 'row', gap: 11, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 11 },
  activeItem: { backgroundColor: '#E7EDFB' },
  itemName: { fontFamily: fonts.medium, color: '#4B5A74', fontSize: 12 },
  itemSub: { fontFamily: fonts.regular, color: '#94A0B4', fontSize: 9, marginTop: 5 },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.blue },
  bottom: { paddingHorizontal: 20, paddingTop: 20 },
  note: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingHorizontal: 5, paddingBottom: 18 },
  noteDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#A3AEBD' },
  noteText: { fontFamily: fonts.regular, fontSize: 10, color: '#9AA4B5' },
  profile: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 80, borderTopWidth: 1, borderTopColor: '#E1E6F0' },
  initial: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#E3E8F2', alignItems: 'center', justifyContent: 'center' },
  initialText: { fontFamily: fonts.bold, fontSize: 14, color: '#6C7F9B' },
  profileName: { fontFamily: fonts.medium, fontSize: 12, color: colors.ink },
  profileMajor: { fontFamily: fonts.regular, fontSize: 9, color: '#94A0B5', marginTop: 5 }
});
