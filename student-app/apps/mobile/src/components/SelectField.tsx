import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Check, ChevronDown, Search, X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';
export type SelectOption = { value: string; label: string };
type Props = { label: string; value: string; options: SelectOption[]; onChange(value: string): void; placeholder?: string; disabled?: boolean; error?: string };
export function SelectField({ label, value, options, onChange, placeholder = '선택해 주세요', disabled, error }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const selected = options.find(option => option.value === value);
  const filtered = options.filter(option => option.label.replace(/\s/g, '').toLowerCase().includes(search.replace(/\s/g, '').toLowerCase()));
  function close() { setOpen(false); setSearch(''); }
  return <View style={{ gap: 8 }}>
    <Text style={styles.label}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label + ', ' + (selected?.label ?? placeholder)} accessibilityState={{ disabled: !!disabled, expanded: open }}
      onPress={() => setOpen(true)} disabled={disabled} style={[styles.field, error && { borderColor: colors.danger }, disabled && { backgroundColor: '#F5F6FA' }]}>
      <Text numberOfLines={1} style={[styles.value, !selected && { color: '#A0A8B8' }]}>{selected?.label ?? placeholder}</Text><ChevronDown size={17} color={colors.muted} />
    </Pressable>
    {!!error && <Text style={styles.error}>{error}</Text>}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={[styles.overlay, { justifyContent: width >= 768 ? 'center' : 'flex-end' }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="선택창 닫기" onPress={close} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[styles.sheet, { maxHeight: height * 0.8, paddingBottom: Math.max(insets.bottom, 16), marginBottom: width < 768 ? 8 : 0 }]}>
          <View style={styles.sheetHeader}><Text style={styles.title}>{label} 선택</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={close} style={styles.close}><X size={21} color={colors.muted} /></Pressable></View>
          <View style={styles.search}><Search size={17} color={colors.muted} /><TextInput accessibilityLabel={label + ' 검색'} placeholder="검색해서 빠르게 찾기" placeholderTextColor="#9BA5B7"
            value={search} onChangeText={setSearch} style={styles.searchInput} autoCorrect={false} /></View>
          <FlatList data={filtered} keyExtractor={option => option.value} keyboardShouldPersistTaps="handled"
            style={{ flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 6 }}
            ListEmptyComponent={<Text style={styles.empty}>검색 결과가 없어요.</Text>}
            renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{ selected: item.value === value }}
              onPress={() => { onChange(item.value); close(); }} style={({ pressed }) => [styles.option, item.value === value && { backgroundColor: colors.blueSoft }, pressed && { backgroundColor: colors.blueSoft }]}>
              <Text style={[styles.optionText, item.value === value && { color: colors.blue }]}>{item.label}</Text>
              {item.value === value && <Check size={18} color={colors.blue} />}
            </Pressable>} />
        </View>
      </View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  field: { minHeight: 53, borderWidth: 1, borderColor: colors.border, borderRadius: 11, paddingHorizontal: 15, gap: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF' },
  value: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: 11 },
  overlay: { flex: 1, backgroundColor: '#12203766', alignItems: 'center', padding: 12 },
  sheet: { width: '100%', maxWidth: 510, borderRadius: 23, backgroundColor: '#FFFFFF', overflow: 'hidden' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 22, paddingRight: 10, paddingTop: 10 },
  title: { fontFamily: fonts.bold, fontSize: 19, color: colors.ink },
  close: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  search: { margin: 16, marginTop: 10, backgroundColor: colors.background, borderRadius: 11, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 8 },
  searchInput: { minHeight: 45, flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  option: { minHeight: 50, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  optionText: { flex: 1, fontFamily: fonts.regular, fontSize: 14, color: colors.ink },
  empty: { fontFamily: fonts.regular, fontSize: 14, textAlign: 'center', color: colors.muted, padding: 35 }
});
