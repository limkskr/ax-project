import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { useAppStore } from '../state/store';
import { colors, fonts } from '../theme';
export function StorageNotice() {
  const { storageError, retrySave, loadFailed } = useAppStore();
  if (!storageError) return null;
  return <View accessibilityRole="alert" style={styles.notice}><AlertCircle size={17} color={colors.danger} /><Text style={styles.text}>{storageError}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={loadFailed ? '저장 정보 다시 불러오기' : '저장 다시 시도'} onPress={() => void retrySave()} style={styles.retry}><Text style={styles.retryText}>다시 시도</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({
  notice: { padding: 12, backgroundColor: '#FFF0ED', borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  text: { flex: 1, fontFamily: fonts.regular, color: colors.danger, fontSize: 11 },
  retry: { padding: 10 }, retryText: { fontFamily: fonts.bold, fontSize: 11, color: colors.danger }
});
