import { StyleSheet, Text, View } from 'react-native';
import { Check, GraduationCap } from 'lucide-react-native';
import { colors, fonts } from '../theme';
export function Brand({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <View style={styles.brand}>
    <View style={[styles.mark, light && { backgroundColor: '#FFFFFF18' }]}><GraduationCap size={25} color={light ? '#FFFFFF' : colors.blue} strokeWidth={1.8} /></View>
    <View><Text style={[styles.name, light && { color: '#FFFFFF' }]}>교수<Text style={{ color: light ? '#9DBBFF' : colors.blue }}>AI</Text></Text>
      {!compact && <Text style={[styles.sub, light && { color: '#A9B9D1' }]}>금오공과대학교 학사 안내</Text>}</View>
  </View>;
}
export function Steps({ current }: { current: number }) {
  return <View style={styles.steps}>{['기본정보', '교수 선택', '대화'].map((label, i) => <View key={label} style={styles.step}>
    <View style={[styles.number, i + 1 === current && { backgroundColor: colors.blue }, i + 1 < current && { backgroundColor: colors.greenSoft }]}>
      {i + 1 < current ? <Check size={12} color={colors.green} /> : <Text style={[styles.numberText, i + 1 === current && { color: '#FFFFFF' }]}>{i + 1}</Text>}
    </View><Text style={[styles.stepText, i + 1 === current && { color: colors.ink, fontFamily: fonts.bold }]}>{label}</Text>
    {i < 2 && <View style={styles.line} />}
  </View>)}</View>;
}
const styles = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.bold, fontSize: 22, color: colors.ink, letterSpacing: -1 },
  sub: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 1 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  number: { width: 23, height: 23, borderRadius: 12, backgroundColor: '#E9EDF4', alignItems: 'center', justifyContent: 'center' },
  numberText: { fontFamily: fonts.medium, fontSize: 11, color: colors.muted },
  stepText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  line: { width: 20, height: 1, backgroundColor: colors.border, marginLeft: 3 }
});
