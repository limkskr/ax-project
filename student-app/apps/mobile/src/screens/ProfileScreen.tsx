import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, BookOpen, CalendarDays, GraduationCap, Sparkles } from 'lucide-react-native';
import { Brand, Steps } from '../components/Brand';
import { Button } from '../components/Button';
import { SelectField } from '../components/SelectField';
import { StorageNotice } from '../components/StorageNotice';
import { units, getUnit } from '../catalog';
import { validateProfile } from '../domain/profile';
import type { ProfileErrors, ProfileInput } from '../domain/types';
import { useAppStore } from '../state/store';
import { colors, fonts } from '../theme';

export default function ProfileScreen() {
  const { session, saveProfile, loadFailed } = useAppStore();
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const editing = edit === '1' && !!session.profile;
  const [draft, setDraft] = useState<ProfileInput>(() => session.profile ?? { name: '', studentNumber: '', grade: '1', unitId: '', programId: undefined });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [busy, setBusy] = useState(false);
  const { width, height } = useWindowDimensions();
  const wide = width >= 1000;
  const unit = getUnit(draft.unitId);
  function update<K extends keyof ProfileInput>(key: K, value: ProfileInput[K]) {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
  }
  function changeUnit(value: string) {
    const selected = getUnit(value);
    setDraft(previous => ({ ...previous, unitId: value, programId: selected?.programs.length === 1 ? selected.programs[0].id : selected?.programs.length === 0 ? null : undefined }));
    setErrors(previous => ({ ...previous, unitId: undefined, programId: undefined }));
  }
  async function submit() {
    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length || draft.programId === undefined) return;
    setBusy(true);
    try {
      if (await saveProfile({ ...draft, programId: draft.programId })) {
        if (editing && session.lastProfessorId) router.replace({ pathname: '/chat/[professorId]', params: { professorId: session.lastProfessorId } });
        else router.replace('/professors');
      }
    } finally { setBusy(false); }
  }
  return <SafeAreaView style={styles.page}>
    <View style={styles.layout}>
      {wide && <LinearGradient colors={['#1D3D68', '#112645']} style={styles.hero}>
        <Brand light />
        <View style={[styles.heroContent, height < 800 && { paddingVertical: 18 }]}>
          <View style={styles.heroPill}><Sparkles size={13} color="#BDD5FF" /><Text style={styles.heroPillText}>나의 캠퍼스 가이드</Text></View>
          <Text style={styles.heroTitle}>내 전공, 내 질문.{ '\n' }<Text style={{ color: '#A9C8FF' }}>나의 교수 AI.</Text></Text>
          <Text style={styles.heroDesc}>복잡한 학교생활의 궁금증을{ '\n' }익숙한 교수 AI와 함께 풀어가세요.</Text>
          <View style={styles.heroTopics}>
            {[{ Icon: CalendarDays, title: '학교 학사일정', body: '중요한 날짜를 한눈에' }, { Icon: BookOpen, title: '전공별 교육과정', body: '내 전공에 맞는 안내' }, { Icon: GraduationCap, title: '졸업과 학사정보', body: '필요한 기준을 차근차근' }].map(({ Icon, title, body }) => <View key={title} style={styles.heroTopic}>
              <View style={styles.topicIcon}><Icon size={21} color="#AAC7F6" strokeWidth={1.6} /></View>
              <View><Text style={styles.topicTitle}>{title}</Text><Text style={styles.topicDesc}>{body}</Text></View>
            </View>)}
          </View>
        </View>
        <View><View style={styles.heroFooterLine} /><Text style={styles.heroFooterText}>KUMOH NATIONAL INSTITUTE OF TECHNOLOGY</Text><Text style={styles.heroFooterSub}>학생을 위한 학사 안내 서비스</Text></View>
      </LinearGradient>}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.right}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.scroll, { paddingHorizontal: wide ? 48 : 22 }]}>
          {!wide && <View style={styles.mobileBrand}><Brand /><Text style={styles.previewTag}>학생용</Text></View>}
          <View style={styles.formWrap}>
            {editing ? <Pressable accessibilityRole="button" accessibilityLabel="대화창으로 돌아가기" onPress={() => router.back()} style={styles.back}><ArrowLeft size={17} color={colors.muted} /><Text style={styles.backText}>돌아가기</Text></Pressable> : <Steps current={1} />}
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>{editing ? 'MY PROFILE' : 'WELCOME TO PROFESSOR AI'}</Text>
              <Text style={styles.title}>{editing ? '내 기본정보' : '반가워요, 금오인!'}</Text>
              <Text style={styles.description}>{editing ? '전공과 학년이 바뀌었다면 수정해 주세요.' : '나에게 맞는 학사 안내를 위해\n기본정보를 알려주세요.'}</Text>
            </View>
            <View style={styles.form}>
              <StorageNotice />
              <View style={styles.row}>
                <View style={styles.field}><Text style={styles.label}>이름</Text><TextInput accessibilityLabel="이름" placeholder="이름을 입력하세요" placeholderTextColor="#A0A8B8" value={draft.name} maxLength={40}
                  onChangeText={value => update('name', value)} style={[styles.input, errors.name && { borderColor: colors.danger }]} autoCorrect={false} />
                  {!!errors.name && <Text style={styles.error}>{errors.name}</Text>}</View>
                <View style={styles.field}><Text style={styles.label}>학번</Text><TextInput accessibilityLabel="학번" placeholder="학번을 입력하세요" placeholderTextColor="#A0A8B8" value={draft.studentNumber} maxLength={32}
                  onChangeText={value => update('studentNumber', value)} style={[styles.input, errors.studentNumber && { borderColor: colors.danger }]} keyboardType="number-pad" autoCorrect={false} />
                  {!!errors.studentNumber && <Text style={styles.error}>{errors.studentNumber}</Text>}</View>
              </View>
              <View style={{ gap: 9 }}><Text style={styles.label}>학년</Text><View style={styles.grades}>{['1', '2', '3', '4', '5+'].map(grade =>
                <Pressable key={grade} accessibilityRole="button" accessibilityLabel={grade === '5+' ? '5학년 또는 초과학기' : grade + '학년'} accessibilityState={{ selected: draft.grade === grade }}
                  onPress={() => update('grade', grade)} style={[styles.grade, draft.grade === grade && styles.gradeSelected]}>
                  <Text style={[styles.gradeText, draft.grade === grade && { color: colors.blue, fontFamily: fonts.bold }]}>{grade === '5+' ? '5학년+' : grade + '학년'}</Text>
                </Pressable>)}</View></View>
              <SelectField label="학부·학과" value={draft.unitId} placeholder="소속 학부·학과를 선택하세요"
                options={units.filter(item => item.studentSelectable).map(item => ({ value: item.id, label: item.name }))} onChange={changeUnit} error={errors.unitId} />
              {!!unit && unit.programs.length > 1 && <SelectField label="전공" value={draft.programId === null ? '__undeclared' : draft.programId ?? ''} placeholder="전공을 선택하세요"
                options={[...unit.programs.map(program => ({ value: program.id, label: program.name })), { value: '__undeclared', label: '전공 미정 / 배정 전' }]}
                onChange={value => update('programId', value === '__undeclared' ? null : value)} error={errors.programId} />}
              {!!unit && unit.programs.length === 0 && <Text style={styles.help}>전공 배정 전에는 자율전공학부로 시작할 수 있어요.</Text>}
              <Button label={editing ? '기본정보 저장' : '교수 선택하기'} disabled={loadFailed} loading={busy} onPress={() => void submit()} style={{ marginTop: 7 }} />
              <Text style={styles.saveNote}>기본정보는 이 기기에 저장되며, 나중에 수정할 수 있어요.</Text>
            </View>
            <Text style={styles.footer}>금오공과대학교를 위한 교수 AI</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  layout: { flex: 1, flexDirection: 'row' }, right: { flex: 1 },
  hero: { width: '41%', padding: 44, justifyContent: 'space-between' },
  heroContent: { paddingVertical: 55 }, heroPill: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', backgroundColor: '#FFFFFF12', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 30 },
  heroPillText: { fontFamily: fonts.medium, fontSize: 11, color: '#BDD5FF' },
  heroTitle: { fontFamily: fonts.bold, fontSize: 39, lineHeight: 58, letterSpacing: -1.5, color: '#FFFFFF', marginTop: 26 },
  heroDesc: { fontFamily: fonts.regular, color: '#AABCD6', fontSize: 14, lineHeight: 25, marginTop: 22 },
  heroTopics: { marginTop: 40, gap: 23 }, heroTopic: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  topicIcon: { width: 44, height: 44, backgroundColor: '#FFFFFF0D', borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF14' },
  topicTitle: { fontFamily: fonts.medium, color: '#E4EDFA', fontSize: 13 }, topicDesc: { fontFamily: fonts.regular, color: '#8FA6C8', fontSize: 11, marginTop: 4 },
  heroFooterLine: { height: 1, backgroundColor: '#FFFFFF18', marginBottom: 22 }, heroFooterText: { fontFamily: fonts.medium, color: '#7994BA', fontSize: 9, letterSpacing: 1.3 }, heroFooterSub: { fontFamily: fonts.regular, color: '#8CA3C4', fontSize: 10, marginTop: 8 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 42 },
  mobileBrand: { width: '100%', maxWidth: 480, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 38 },
  previewTag: { fontFamily: fonts.medium, color: colors.muted, fontSize: 11, backgroundColor: '#EBEEF5', paddingVertical: 5, paddingHorizontal: 11, borderRadius: 20 },
  formWrap: { width: '100%', maxWidth: 480 }, heading: { marginTop: 33, marginBottom: 26 },
  eyebrow: { fontFamily: fonts.medium, fontSize: 9, letterSpacing: 1.8, color: colors.blue },
  title: { fontFamily: fonts.bold, color: colors.ink, fontSize: 30, letterSpacing: -1, marginTop: 9 },
  description: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, lineHeight: 23, marginTop: 11 },
  form: { gap: 22 }, row: { flexDirection: 'row', gap: 15 }, field: { flex: 1, gap: 8 },
  label: { fontFamily: fonts.medium, fontSize: 13, color: colors.ink },
  input: { height: 53, borderRadius: 11, borderWidth: 1, borderColor: colors.border, backgroundColor: '#FFFFFF', paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 13, color: colors.ink },
  error: { fontFamily: fonts.regular, fontSize: 11, color: colors.danger },
  grades: { flexDirection: 'row', gap: 8 }, grade: { flex: 1, minHeight: 46, paddingHorizontal: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: '#FFFFFF' },
  gradeSelected: { borderColor: '#ABC0FF', backgroundColor: colors.blueSoft },
  gradeText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  saveNote: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 10, lineHeight: 18, color: '#939CAD', marginTop: -8 },
  footer: { fontFamily: fonts.regular, textAlign: 'center', fontSize: 10, color: '#ADB5C3', marginTop: 30 },
  help: { fontFamily: fonts.regular, fontSize: 11, color: colors.muted, lineHeight: 20 },
  back: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 44 }, backText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted }
});
