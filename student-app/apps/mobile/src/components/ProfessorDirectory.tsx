import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { ArrowRight, Check, GraduationCap, Search, SlidersHorizontal } from 'lucide-react-native';
import { Steps } from './Brand';
import { Button } from './Button';
import { ProfessorAvatar } from './ProfessorAvatar';
import { SelectField } from './SelectField';
import { StorageNotice } from './StorageNotice';
import { checkedAt, getProfileLabel, getProfessorLabel, getProfessors, getUnit, units } from '../catalog';
import type { Professor, StudentProfile } from '../domain/types';
import { colors, fonts } from '../theme';

type Props = {
  profile: StudentProfile;
  onSelect(professorId: string): Promise<void>;
  addedProfessorIds: readonly string[];
  variant?: 'page' | 'popup';
};

export function ProfessorDirectory({ profile, onSelect, addedProfessorIds, variant = 'page' }: Props) {
  const popup = variant === 'popup';
  const [unitId, setUnitId] = useState(profile.unitId);
  const [programId, setProgramId] = useState(profile.programId ?? '');
  const [query, setQuery] = useState('');
  const [includeEmeritus, setIncludeEmeritus] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);
  const openingRef = useRef(false);
  const { width } = useWindowDimensions();
  const contentWidth = popup ? Math.min(width - 32, 760) : width;
  const compact = contentWidth < 560;
  const columns = popup ? (contentWidth >= 600 ? 2 : 1) : width >= 1200 ? 4 : width >= 800 ? 3 : 2;
  const unit = getUnit(unitId);
  const selected = useMemo(() => getProfessors({ unitId, programId, query, includeEmeritus }), [unitId, programId, query, includeEmeritus]);
  const added = new Set(addedProfessorIds);
  const cards: (Professor | null)[] = [...selected];
  while (cards.length % columns) cards.push(null);

  function reset() { setUnitId(''); setProgramId(''); setQuery(''); }
  async function open(professorId: string) {
    if (openingRef.current) return;
    openingRef.current = true;
    setOpening(professorId);
    try { await onSelect(professorId); }
    finally { openingRef.current = false; setOpening(null); }
  }

  const filters = <View style={[styles.filterPanel, compact && { padding: 16, gap: 12 }, popup && styles.popupFilters]}>
    {!popup && <View style={styles.filterHeading}><SlidersHorizontal size={15} color={colors.muted} /><Text style={styles.filterHeadingText}>교수 찾기</Text>
      {!!unitId && <Pressable accessibilityRole="button" accessibilityLabel="전체 교수 보기" onPress={reset} style={styles.reset}><Text style={styles.resetText}>전체 보기</Text></Pressable>}</View>}
    <View style={[styles.selectRow, contentWidth < 340 && { flexDirection: 'column' }]}>
      <View style={{ flex: 1 }}><SelectField label="학부·학과" value={unitId} options={[{ value: '', label: '전체 학부·학과' }, ...units.map(item => ({ value: item.id, label: item.name }))]}
        onChange={value => { setUnitId(value); setProgramId(''); }} /></View>
      <View style={{ flex: 1 }}><SelectField label="전공" value={programId} disabled={!unit || unit.programs.length === 0}
        options={[{ value: '', label: '전체 전공' }, ...(unit?.programs.map(program => ({ value: program.id, label: program.name })) ?? [])]} onChange={setProgramId} /></View>
    </View>
    <View style={styles.searchField}><Search size={18} color={colors.muted} /><TextInput accessibilityLabel="교수 이름 검색" placeholder="교수 이름으로 검색해 보세요" placeholderTextColor="#9BA5B7"
      value={query} onChangeText={setQuery} style={styles.searchInput} autoCorrect={false} /></View>
  </View>;
  const resultHeading = <View style={[styles.resultHeading, compact && { marginTop: 18, marginBottom: 12 }, popup && styles.popupResultHeading]}>
    <Text style={styles.resultTitle}>교수 AI <Text style={{ color: colors.blue }}>{selected.length}</Text></Text>
    {popup && <Pressable accessibilityRole="button" accessibilityLabel="전체 교수 보기" onPress={reset} style={styles.reset}><Text style={styles.resetText}>전체 보기</Text></Pressable>}
    <Pressable accessibilityRole="checkbox" accessibilityLabel="명예교수 포함" accessibilityState={{ checked: includeEmeritus }} onPress={() => setIncludeEmeritus(value => !value)} style={styles.checkboxRow}>
      <View style={[styles.checkbox, includeEmeritus && { backgroundColor: colors.blue, borderColor: colors.blue }]}>{includeEmeritus && <Check size={11} color="#FFFFFF" />}</View>
      <Text style={styles.checkboxLabel}>명예교수 포함</Text>
    </Pressable>
  </View>;
  const pageHeader = <View style={[styles.contentHeader, compact && { paddingTop: 22 }]}>
    {width < 760 && <View style={{ marginBottom: compact ? 20 : 28 }}><Steps current={2} /></View>}
    <Text style={styles.eyebrow}>CHOOSE YOUR PROFESSOR</Text>
    <Text style={[styles.title, width < 500 && { fontSize: 25 }]}>어떤 교수 AI와 함께할까요?</Text>
    <Text style={styles.description}>전공을 선택하고, 궁금한 학사정보를 안내할 교수 AI를 만나보세요.</Text>
    <View style={[styles.myMajor, compact && { marginTop: 18, marginBottom: 18, paddingVertical: 12 }]}><View style={styles.myMajorLabel}><GraduationCap size={17} color={colors.blue} /><Text style={styles.myMajorText}>내 전공</Text></View>
      <Text style={styles.myMajorValue}>{getProfileLabel(profile.unitId, profile.programId)}</Text></View>
    <StorageNotice />{filters}{resultHeading}
  </View>;

  return <View style={{ flex: 1, minHeight: 0 }}>
    <FlatList key={columns} data={cards} numColumns={columns} keyExtractor={(professor, index) => professor?.id ?? 'empty-' + index}
      style={{ flex: 1 }} contentContainerStyle={[styles.gridContainer, { paddingHorizontal: compact ? 18 : 32 }, popup && styles.popupGrid]}
      columnWrapperStyle={columns > 1 ? { gap: compact ? 12 : 18 } : undefined}
      ListHeaderComponent={popup ? <View>{filters}{resultHeading}</View> : pageHeader} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
      ListEmptyComponent={<View style={styles.empty}><View style={styles.emptyIcon}><GraduationCap size={32} color="#A5B1C7" /></View>
        <Text style={styles.emptyTitle}>{unit?.rosterStatus === 'pending' && !query ? '교수 명단을 확인하고 있어요' : '검색 결과가 없어요'}</Text>
        <Text style={styles.emptyText}>{unit?.rosterStatus === 'pending' && !query ? '이 학과의 공개 교수 명단은 확인 중입니다.\n다른 전공의 교수 AI를 선택할 수 있어요.' : '다른 이름이나 전공으로 다시 찾아보세요.'}</Text>
        <Button label="전체 교수 찾기" outline onPress={reset} style={{ marginTop: 18, minWidth: 160 }} /></View>}
      ListFooterComponent={<Text style={styles.source}>공식 홈페이지의 공개 명단 기준 · {checkedAt.replaceAll('-', '.')} 확인</Text>}
      renderItem={({ item }) => {
        if (!item) return <View style={{ flex: 1 }} />;
        const exists = added.has(item.id);
        const action = exists ? '기존 대화로 돌아가기' : popup ? '대화목록에 추가하기' : '대화창 열기';
        const badge = <View style={[styles.tag, exists && styles.addedTag]}>{exists && <Check size={11} color={colors.blue} />}<Text style={[styles.tagText, exists && { color: colors.blue }]}>{exists ? '추가됨' : 'AI'}</Text></View>;
        return <Pressable accessibilityRole="button" accessibilityLabel={`${item.name} 교수 AI ${action}`} accessibilityState={{ disabled: !!opening }} disabled={!!opening}
          onPress={() => void open(item.id)} style={({ pressed }) => [styles.card, popup && styles.popupCard, exists && { borderColor: '#C9D7FA' }, pressed && { borderColor: '#9DB7FF', backgroundColor: '#F7F9FF' }]}>
          {popup ? <ProfessorAvatar professor={item} size={43} /> : <View style={styles.cardTop}><ProfessorAvatar professor={item} size={width < 500 ? 48 : 55} />{badge}</View>}
          <View style={popup ? styles.popupCardBody : undefined}>
            <View style={styles.nameRow}><Text style={[styles.professorName, compact && { fontSize: 17 }, popup && { fontSize: 16 }]} numberOfLines={1}>{item.name}<Text style={styles.professorSuffix}> 교수</Text></Text>{popup && badge}</View>
            <Text style={[styles.affiliation, popup && styles.popupAffiliation]} numberOfLines={2}>{getProfessorLabel(item)}{item.isEmeritus ? ' · 명예교수' : ''}</Text>
            <View style={[styles.cardFooter, popup && styles.popupCardFooter]}><Text style={[styles.cardFooterText, (popup || exists) && { color: colors.blue }]}>{action}</Text>
              {opening === item.id ? <ActivityIndicator size="small" color={colors.blue} /> : <ArrowRight size={15} color={exists || popup ? colors.blue : '#94A4C0'} />}</View>
          </View>
        </Pressable>;
      }}
    />
  </View>;
}

const styles = StyleSheet.create({
  gridContainer: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingBottom: 24 },
  contentHeader: { paddingTop: 42 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.7, color: colors.blue },
  title: { fontFamily: fonts.bold, fontSize: 31, color: colors.ink, letterSpacing: -1, marginTop: 8 },
  description: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 22, marginTop: 12 },
  myMajor: { marginTop: 24, marginBottom: 26, backgroundColor: '#EDF2FF', borderRadius: 12, flexDirection: 'row', gap: 16, alignItems: 'center', paddingVertical: 15, paddingHorizontal: 17, flexWrap: 'wrap' },
  myMajorLabel: { flexDirection: 'row', gap: 7, alignItems: 'center' }, myMajorText: { fontFamily: fonts.medium, color: colors.blue, fontSize: 12 },
  myMajorValue: { fontFamily: fonts.medium, color: '#3D558A', fontSize: 12 },
  filterPanel: { borderWidth: 1, borderColor: colors.border, borderRadius: 17, backgroundColor: '#FFFFFF', padding: 20, gap: 17, marginTop: 2 },
  filterHeading: { flexDirection: 'row', gap: 7, alignItems: 'center' }, filterHeadingText: { fontFamily: fonts.medium, fontSize: 12, color: colors.muted },
  reset: { marginLeft: 'auto', paddingVertical: 10, paddingHorizontal: 8, minHeight: 44, justifyContent: 'center' }, resetText: { fontFamily: fonts.regular, fontSize: 11, color: colors.blue },
  selectRow: { flexDirection: 'row', gap: 14 },
  searchField: { minHeight: 48, flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 14, borderRadius: 11 },
  searchInput: { flex: 1, height: 48, fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 30, marginBottom: 17 },
  resultTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.ink },
  checkboxRow: { flexDirection: 'row', gap: 7, alignItems: 'center', minHeight: 44 }, checkbox: { width: 16, height: 16, borderRadius: 4, borderWidth: 1, borderColor: '#CBD3E1', backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  checkboxLabel: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted },
  card: { flex: 1, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', padding: 20, marginBottom: 18 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F0F3F8', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  addedTag: { backgroundColor: colors.blueSoft }, tagText: { fontFamily: fonts.medium, color: '#8390A6', fontSize: 9 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  professorName: { flex: 1, fontFamily: fonts.bold, fontSize: 20, color: colors.ink }, professorSuffix: { fontFamily: fonts.regular, color: '#69758A', fontSize: 12 },
  affiliation: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, lineHeight: 17, marginTop: 9, minHeight: 34 },
  cardFooter: { borderTopWidth: 1, borderTopColor: '#EFF2F7', paddingTop: 14, marginTop: 19, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  cardFooterText: { fontFamily: fonts.regular, fontSize: 10, color: '#92A0B5' },
  source: { fontFamily: fonts.regular, fontSize: 10, color: '#A3ADBF', lineHeight: 18, textAlign: 'center', marginTop: 24, marginBottom: 10 },
  empty: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 18 },
  emptyIcon: { width: 68, height: 68, borderRadius: 20, backgroundColor: '#EBEFF6', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontFamily: fonts.bold, fontSize: 18, color: colors.ink, marginTop: 20 },
  emptyText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 22, textAlign: 'center', color: colors.muted, marginTop: 10 },
  popupFilters: { borderWidth: 0, padding: 0, borderRadius: 0, marginTop: 0, gap: 12 },
  popupResultHeading: { marginTop: 8, marginBottom: 8, gap: 8 }, popupGrid: { paddingHorizontal: 20, paddingBottom: 12 },
  popupCard: { flexDirection: 'row', gap: 13, padding: 15, marginBottom: 10, borderRadius: 14, alignItems: 'center' },
  popupCardBody: { flex: 1, minWidth: 0 }, popupAffiliation: { minHeight: 0, marginTop: 4 },
  popupCardFooter: { borderTopWidth: 0, paddingTop: 0, marginTop: 9 }
});
