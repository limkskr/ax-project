import { StyleSheet, Text, View } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { Professor } from '../domain/types';
import { fonts } from '../theme';
const palettes = [['#EAF0FF', '#5275DB'], ['#EAF7F2', '#35977D'], ['#F2EBFF', '#8F6CC6'], ['#FFF0E6', '#C58A57'], ['#E8F3FA', '#4C8CA9']];
export function ProfessorAvatar({ professor, size = 54 }: { professor: Professor; size?: number }) {
  const index = [...professor.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) % palettes.length;
  const [backgroundColor, color] = palettes[index];
  return <View accessible={false} style={{ width: size, height: size, borderRadius: size * 0.31, backgroundColor, justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ fontFamily: fonts.bold, fontSize: size * 0.38, color }}>{professor.name.charAt(0)}</Text>
    {size >= 48 && <View style={[styles.spark, { backgroundColor: color }]}><Sparkles size={10} color="#FFFFFF" /></View>}
  </View>;
}
const styles = StyleSheet.create({ spark: { width: 19, height: 19, borderRadius: 7, position: 'absolute', bottom: -3, right: -3, borderWidth: 2, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' } });
