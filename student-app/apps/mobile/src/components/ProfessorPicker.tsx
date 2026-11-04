import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import { ProfessorDirectory } from './ProfessorDirectory';
import type { StudentProfile } from '../domain/types';
import { colors, fonts } from '../theme';

type Props = {
  profile: StudentProfile;
  addedProfessorIds: readonly string[];
  onClose(): void;
  onSelect(professorId: string): Promise<void>;
};

// Keep the drawer and picker in the chat's single native Modal.
export function ProfessorPicker({ profile, addedProfessorIds, onClose, onSelect }: Props) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  return <KeyboardAvoidingView style={{ flex: 1 }} enabled={Platform.OS !== 'web'} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
    <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="교수 찾기 팝업 바깥 닫기" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View accessibilityViewIsModal style={[styles.sheet, { height: Math.min(740, height - insets.top - insets.bottom - 32) }]}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}><Text style={styles.title}>교수 AI 찾기</Text><Text style={styles.description}>함께할 교수를 선택해 대화목록에 추가하세요.</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="교수 찾기 팝업 닫기" onPress={onClose} style={styles.close}><X size={21} color={colors.muted} /></Pressable>
        </View>
        <ProfessorDirectory profile={profile} addedProfessorIds={addedProfessorIds} variant="popup" onSelect={onSelect} />
      </View>
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14213D66', paddingHorizontal: 16 },
  sheet: { width: '100%', maxWidth: 760, flexShrink: 1, minHeight: 0, backgroundColor: '#FFFFFF', borderRadius: 23, overflow: 'hidden' },
  header: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', padding: 20, paddingRight: 12 },
  title: { fontFamily: fonts.bold, fontSize: 21, color: colors.ink },
  description: { fontFamily: fonts.regular, fontSize: 11, lineHeight: 20, color: colors.muted, marginTop: 6 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginTop: -7 }
});
