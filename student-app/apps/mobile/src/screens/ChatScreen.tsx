import { useEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUp, BookOpen, ChevronRight, GraduationCap, Menu, MessageCircle, RefreshCw, Sparkles } from 'lucide-react-native';
import { ProfessorAvatar } from '../components/ProfessorAvatar';
import { Sidebar } from '../components/Sidebar';
import { ProfessorPicker } from '../components/ProfessorPicker';
import { StorageNotice } from '../components/StorageNotice';
import { ChatMessages } from '../components/ChatMessages';
import { getProfessor, getProfessorLabel } from '../catalog';
import { checkApiHealth } from '../services/chat-client';
import { useAppStore } from '../state/store';
import { colors, fonts } from '../theme';

const examples = [
  { Icon: Sparkles, label: '전공 학습', text: '인공지능과 머신러닝의 차이를 쉽게 설명해 주세요.', color: '#5D7AD7', background: '#EFF3FF' },
  { Icon: BookOpen, label: '개념 설명', text: '선형대수의 벡터와 행렬을 쉽게 설명해 주세요.', color: '#48A58C', background: '#EDF8F3' },
  { Icon: GraduationCap, label: '학습 계획', text: '파이썬 기초를 공부하는 일주일 계획을 만들어 주세요.', color: '#9C7CC4', background: '#F5F0FB' },
  { Icon: MessageCircle, label: '연습 문제', text: '머신러닝 개념을 확인할 간단한 문제를 내주세요.', color: '#BA946B', background: '#FCF4EB' },
];
type Health = 'checking' | 'ready' | 'unconfigured' | 'offline';
const healthLabels: Record<Health, string> = { checking: '연결 확인 중', ready: '대화 가능', unconfigured: '키 설정 필요', offline: '서버 연결 필요' };
export default function ChatScreen() {
  const { professorId } = useLocalSearchParams<{ professorId: string }>();
  return <ProfessorChat key={professorId} professorId={professorId} />;
}
function ProfessorChat({ professorId }: { professorId: string }) {
  const { session, ready, loadFailed, pendingByProfessor, chatErrors, sendMessage, retryMessage, selectProfessor } = useAppStore();
  const professor = getProfessor(professorId);
  const [overlay, setOverlay] = useState<'drawer' | 'professors' | null>(null);
  const [draft, setDraft] = useState('');
  const [health, setHealth] = useState<Health>('checking');
  const [healthRefresh, setHealthRefresh] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const messages = session.conversations.find(window => window.professorId === professorId)?.messages || [];
  const pending = !!pendingByProfessor[professorId];
  const canSend = ready && !loadFailed && health === 'ready' && !pending && !!draft.trim() && draft.trim().length <= 2000;
  useEffect(() => {
    const state = useAppStore.getState();
    if (professor && state.session.profile && state.session.lastProfessorId !== professor.id) void state.selectProfessor(professor.id);
  }, [professor]);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function check() {
      let next: Health;
      try { next = await checkApiHealth() ? 'ready' : 'unconfigured'; } catch { next = 'offline'; }
      if (!alive) return;
      setHealth(next);
      if (next !== 'ready') timer = setTimeout(() => { void check(); }, 10000);
    }
    void check();
    return () => { alive = false; clearTimeout(timer); };
  }, [healthRefresh]);
  function send() {
    if (!canSend || !professor) return;
    const content = draft.trim();
    setDraft(''); void sendMessage(professor.id, content);
  }
  function findProfessor() { Keyboard.dismiss(); setOverlay('professors'); }
  function closeOverlay() { Keyboard.dismiss(); setOverlay(null); }
  async function chooseProfessor(nextProfessorId: string) {
    await selectProfessor(nextProfessorId);
    closeOverlay();
    if (nextProfessorId !== professorId) router.replace({ pathname: '/chat/[professorId]', params: { professorId: nextProfessorId } });
  }
  if (!session.profile) return <Redirect href="/profile" />;
  if (!professor) return <Redirect href="/professors" />;
  return <SafeAreaView style={styles.page}>
    <KeyboardAvoidingView style={styles.layout} enabled={Platform.OS !== 'web'} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {wide && <View style={styles.sidebar}><Sidebar activeProfessorId={professor.id} onFindProfessor={findProfessor} /></View>}
      <View style={styles.main}>
        <View style={styles.header}>
          {!wide && <Pressable accessibilityRole="button" accessibilityLabel="교수 목록 열기" onPress={() => { Keyboard.dismiss(); setOverlay('drawer'); }} style={styles.menu}><Menu size={22} color={colors.ink} /></Pressable>}
          <ProfessorAvatar professor={professor} size={36} />
          <View style={styles.headerTitle}><Text style={[styles.headerName, !wide && { fontSize: 16 }]} numberOfLines={1}>{professor.name} 교수 AI</Text>
            <Text style={styles.headerSub} numberOfLines={1}>{getProfessorLabel(professor)}</Text></View>
          <View style={styles.status}><View style={[styles.statusDot, health === 'ready' && { backgroundColor: '#48A58C' }]} /><Text style={styles.statusText}>{healthLabels[health]}</Text></View>
        </View>
        <View style={{ paddingHorizontal: 20 }}><StorageNotice /></View>
        {health !== 'ready' && health !== 'checking' && <View style={styles.connectionNotice}>
          <Text style={styles.connectionText}>{health === 'unconfigured' ? '서버 설정 파일에 Groq API 키를 저장해 주세요.' : 'AI 서버가 실행 중인지 확인해 주세요.'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="서버 연결 다시 확인" onPress={() => { setHealth('checking'); setHealthRefresh(value => value + 1); }} style={styles.refresh}><RefreshCw size={14} color={colors.blue} /><Text style={styles.refreshText}>다시 확인</Text></Pressable>
        </View>}
        <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[styles.chatBody, messages.length > 0 && styles.historyBody, { paddingHorizontal: width < 500 ? 18 : 42 }]}
          onContentSizeChange={() => { if (messages.length) scroll.current?.scrollToEnd({ animated: true }); }} keyboardShouldPersistTaps="handled">
          {messages.length ? <ChatMessages messages={messages} professor={professor} pending={pending} error={chatErrors[professor.id] || null} onRetry={() => { void retryMessage(professor.id); }} /> : <View style={styles.welcome}>
            <View style={styles.heroAvatar}><ProfessorAvatar professor={professor} size={78} /></View>
            <View style={styles.heroBadge}><Sparkles size={12} color={colors.blue} /><Text style={styles.heroBadgeText}>나의 교수 AI</Text></View>
            <Text style={[styles.title, width < 500 && { fontSize: 25, lineHeight: 39 }]}>{professor.name} 교수 AI와{ '\n' }함께하는 학교생활</Text>
            <Text style={styles.description}>전공 개념과 학습 질문을 자유롭게 해보세요.{ '\n' }학교 공식 자료는 아직 연결되어 있지 않습니다.</Text>
            <View style={styles.examplesHeading}><Text style={styles.examplesLabel}>이런 질문으로 시작해 보세요</Text><Text style={styles.examplesNote}>눌러서 입력하기</Text></View>
            <View style={styles.examples}>
              {examples.map(({ Icon, label, text, color, background }) => <Pressable key={label} accessibilityRole="button" accessibilityLabel={text} onPress={() => setDraft(text)} style={({ pressed }) => [styles.example, { width: width < 500 ? '100%' : '48.6%' }, pressed && { backgroundColor: '#F7F9FF' }]}>
                <View style={styles.exampleTop}><View style={[styles.exampleIcon, { backgroundColor: background }]}><Icon size={18} color={color} strokeWidth={1.6} /></View>
                  <Text style={styles.exampleLabel}>{label}</Text><ChevronRight size={14} color="#BBC4D2" style={{ marginLeft: 'auto' }} /></View>
                <Text style={styles.exampleText}>{text}</Text>
              </Pressable>)}
            </View>
          </View>}
        </ScrollView>
        <View style={[styles.composerArea, { paddingHorizontal: width < 500 ? 17 : 35 }]}>
          <View style={styles.composer}>
            <View style={styles.composerRow}>
              <TextInput accessibilityLabel="질문 입력" value={draft} onChangeText={setDraft} editable={ready && !loadFailed && !pending} multiline maxLength={2000}
                placeholder={pending ? '답변을 기다리고 있어요…' : `${professor.name} 교수 AI에게 질문해 보세요.`} placeholderTextColor="#A9B2C2" style={styles.input} />
              <Pressable accessibilityRole="button" accessibilityLabel="질문 보내기" accessibilityState={{ disabled: !canSend }} disabled={!canSend} onPress={send} style={[styles.send, canSend && { backgroundColor: colors.blue }]}><ArrowUp size={20} color="#FFFFFF" /></Pressable>
            </View>
            {draft.length > 1800 && <Text style={styles.counter}>{draft.length} / 2,000</Text>}
          </View>
          <Text style={styles.composerNote}>가상 교수 AI의 답변입니다. 학교 공식 자료 검색은 아직 연결되어 있지 않습니다.</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
    <Modal visible={overlay === 'professors' || (overlay === 'drawer' && !wide)} transparent animationType="fade" onRequestClose={closeOverlay}>
      {overlay === 'professors' ? <ProfessorPicker profile={session.profile} addedProfessorIds={session.conversations.map(conversation => conversation.professorId)} onClose={closeOverlay} onSelect={chooseProfessor} /> : overlay === 'drawer' ?
      <View style={styles.drawerOverlay}><Pressable accessibilityRole="button" accessibilityLabel="교수 목록 바깥 닫기" style={StyleSheet.absoluteFill} onPress={closeOverlay} />
        <SafeAreaView style={{ width: Math.min(310, width * 0.86), flex: 1, backgroundColor: '#F3F5FA' }}>
          <Sidebar activeProfessorId={professor.id} onClose={closeOverlay} onFindProfessor={findProfessor} />
        </SafeAreaView>
      </View> : null}
    </Modal>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#FFFFFF' }, layout: { flex: 1, flexDirection: 'row' },
  sidebar: { width: 282, borderRightWidth: 1, borderRightColor: '#E9EDF5' }, main: { flex: 1, minWidth: 0 },
  header: { minHeight: 85, flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 25, borderBottomWidth: 1, borderBottomColor: '#F0F2F7' },
  headerTitle: { flex: 1, minWidth: 0 }, headerName: { fontFamily: fonts.bold, fontSize: 17, color: colors.ink },
  headerSub: { fontFamily: fonts.regular, fontSize: 10, color: colors.muted, marginTop: 5 },
  menu: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -13 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F4F6FA', paddingHorizontal: 9, paddingVertical: 7, borderRadius: 20 },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#98A5B7' },
  statusText: { fontFamily: fonts.regular, fontSize: 9, color: '#748299' },
  connectionNotice: { marginHorizontal: 20, padding: 12, backgroundColor: '#F1F5FF', borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  connectionText: { flex: 1, fontFamily: fonts.regular, fontSize: 11, lineHeight: 20, color: '#6B7B96' },
  refresh: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40 }, refreshText: { fontFamily: fonts.medium, fontSize: 11, color: colors.blue },
  chatBody: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 38, paddingBottom: 40 },
  historyBody: { justifyContent: 'flex-start', paddingTop: 30 },
  welcome: { width: '100%', maxWidth: 660, alignItems: 'center' }, heroAvatar: { marginBottom: 22 },
  heroBadge: { flexDirection: 'row', gap: 6, alignItems: 'center', backgroundColor: '#F1F5FF', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20 },
  heroBadgeText: { fontFamily: fonts.medium, color: colors.blue, fontSize: 10 },
  title: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: -1, lineHeight: 48, color: colors.ink, textAlign: 'center', marginTop: 15 },
  description: { fontFamily: fonts.regular, color: colors.muted, fontSize: 12, lineHeight: 23, textAlign: 'center', marginTop: 16 },
  examplesHeading: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, marginBottom: 12 },
  examplesLabel: { fontFamily: fonts.medium, fontSize: 11, color: '#8A97AD' }, examplesNote: { fontFamily: fonts.regular, fontSize: 9, color: '#B2BBC9' },
  examples: { width: '100%', flexDirection: 'row', flexWrap: 'wrap', gap: 14, justifyContent: 'space-between' },
  example: { borderWidth: 1, borderColor: '#E9EDF5', borderRadius: 14, padding: 17, backgroundColor: '#FFFFFF' },
  exampleTop: { flexDirection: 'row', gap: 9, alignItems: 'center' }, exampleIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  exampleLabel: { fontFamily: fonts.medium, fontSize: 12, color: '#596983' }, exampleText: { fontFamily: fonts.regular, color: '#7F8DA3', fontSize: 10, lineHeight: 18, marginTop: 10 },
  composerArea: { paddingTop: 14, paddingBottom: 16, backgroundColor: '#FFFFFF' },
  composer: { width: '100%', maxWidth: 780, alignSelf: 'center', borderRadius: 18, borderWidth: 1, borderColor: '#E5EAF3', backgroundColor: '#FAFBFD', padding: 13 },
  composerRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  input: { flex: 1, minHeight: 38, maxHeight: 110, fontFamily: fonts.regular, color: colors.ink, fontSize: 13, lineHeight: 22, paddingVertical: 9 },
  send: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#CDD6E8', alignItems: 'center', justifyContent: 'center' },
  counter: { fontFamily: fonts.regular, textAlign: 'right', color: colors.muted, fontSize: 10, marginTop: 4 },
  composerNote: { textAlign: 'center', fontFamily: fonts.regular, fontSize: 9, lineHeight: 17, color: '#8D9BB1', marginTop: 10 },
  drawerOverlay: { flex: 1, flexDirection: 'row', backgroundColor: '#14213D66' },
});
