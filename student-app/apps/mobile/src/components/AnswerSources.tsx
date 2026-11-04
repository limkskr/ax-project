import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Linking from 'expo-linking';
import { BookOpen, ExternalLink } from 'lucide-react-native';
import type { AnswerSource, SearchInfo } from '../domain/types';
import { colors, fonts } from '../theme';

const checkedTime = (iso: string) => new Date(iso).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export function AnswerSources({ sources = [], search }: { sources?: AnswerSource[]; search?: SearchInfo }) {
  const [openError, setOpenError] = useState<string | null>(null);
  if (!sources.length && !search) return null;
  async function open(source: AnswerSource) {
    setOpenError(null);
    try { await Linking.openURL(source.url); }
    catch { setOpenError('원문을 열지 못했어요. 인터넷 연결을 확인한 후 다시 눌러 주세요.'); }
  }
  return <View style={styles.container}>
    <View style={styles.heading}><BookOpen size={13} color={colors.blue} /><Text style={styles.label}>금오공대 공식 자료</Text>
      <Text style={styles.status}>{search?.status === 'not_found' ? '관련 자료 확인 필요' : search?.status === 'partial' ? '확인 범위 안내 포함' : '출처 확인'}</Text></View>
    {sources.map(source => <View key={source.id} style={styles.source}>
      <Pressable accessibilityRole="link" accessibilityLabel={`출처 ${source.number}: ${source.title}, 공식 원문 열기`} onPress={() => { void open(source); }}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <View style={styles.number}><Text style={styles.numberText}>{source.number}</Text></View>
        <View style={styles.details}>
          <View style={styles.category}><Text style={styles.categoryText}>{source.scope === 'common' ? '학교 공통' : '전공 자료'}</Text>
            {source.stale && <Text style={styles.stale}>저장된 자료</Text>}</View>
          <Text style={styles.title} numberOfLines={2}>{source.title}</Text>
          <Text style={styles.date}>{source.publishedAt ? `게시 ${source.publishedAt} · ` : ''}확인 {checkedTime(source.fetchedAt)}</Text>
        </View>
        <ExternalLink size={14} color="#8A99AF" />
      </Pressable>
      {source.limitations.map((limitation, index) => <Text key={index} style={styles.limitation}>{limitation}</Text>)}
    </View>)}
    {!!search?.notices.length && <View style={styles.notice}>{search.notices.map((notice, index) => <Text key={index} style={styles.noticeText}>{notice}</Text>)}</View>}
    {openError && <Text accessibilityLiveRegion="polite" style={styles.error}>{openError}</Text>}
  </View>;
}
const styles = StyleSheet.create({
  container: { marginTop: 16, gap: 8 }, heading: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 1 },
  label: { fontFamily: fonts.medium, color: '#52698D', fontSize: 11 }, status: { fontFamily: fonts.regular, color: '#8D9AB0', fontSize: 9 },
  source: { borderRadius: 12, borderWidth: 1, borderColor: '#E5EBF5', backgroundColor: '#F8FAFE', overflow: 'hidden' },
  link: { flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, minHeight: 64 }, pressed: { backgroundColor: '#EDF2FC' },
  number: { width: 24, height: 24, backgroundColor: '#E9EFFF', borderRadius: 7, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginTop: 3 },
  numberText: { fontFamily: fonts.medium, color: colors.blue, fontSize: 11 }, details: { flex: 1, minWidth: 0, gap: 4 },
  category: { flexDirection: 'row', gap: 8 }, categoryText: { fontFamily: fonts.medium, color: '#6483B3', fontSize: 9 },
  title: { fontFamily: fonts.medium, color: '#334664', fontSize: 11, lineHeight: 18 },
  date: { fontFamily: fonts.regular, color: '#8D9AB0', fontSize: 9, lineHeight: 15 }, stale: { fontFamily: fonts.regular, color: '#B07C46', fontSize: 9 },
  limitation: { fontFamily: fonts.regular, fontSize: 10, color: '#8B775F', lineHeight: 17, paddingHorizontal: 12, paddingBottom: 10 },
  notice: { padding: 10, borderRadius: 9, backgroundColor: '#FFF8EE', gap: 6 }, noticeText: { fontFamily: fonts.regular, fontSize: 10, lineHeight: 18, color: '#9B7B50' },
  error: { fontFamily: fonts.regular, color: colors.danger, fontSize: 10, lineHeight: 17 },
});
