import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { colors, fonts } from '../theme';
type Props = { label: string; onPress?: () => void; disabled?: boolean; loading?: boolean; outline?: boolean; style?: StyleProp<ViewStyle> };
export function Button({ label, onPress, disabled, loading, outline, style }: Props) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !!disabled || !!loading }}
    disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, outline && styles.outline, (disabled || loading) && { opacity: 0.55 }, pressed && { opacity: 0.8 }, style]}>
    {loading ? <ActivityIndicator color={outline ? colors.blue : '#FFFFFF'} /> : <>
      <Text style={[styles.label, outline && { color: colors.blue }]}>{label}</Text>
      {!outline && <ArrowRight size={18} color="#FFFFFF" />}
    </>}
  </Pressable>;
}
const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 13, backgroundColor: colors.blue, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  label: { fontFamily: fonts.bold, fontSize: 15, color: '#FFFFFF' }
});
