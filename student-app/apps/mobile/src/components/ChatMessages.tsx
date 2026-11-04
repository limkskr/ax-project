import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ChatMessage, Professor } from '../domain/types';
import { ProfessorAvatar } from './ProfessorAvatar';
import { AnswerContent } from './AnswerContent';
import { AnswerSources } from './AnswerSources';
import { colors, fonts } from '../theme';

export function ChatMessages({ messages, professor, pending, error, onRetry }: {
  messages: ChatMessage[]; professor: Professor; pending: boolean; error: string | null; onRetry(): void;
}) {
  const retryable = messages.at(-1)?.role === 'user' && messages.at(-1)?.status === 'failed';
  return <View style={styles.history}>
    {messages.map(message => <View key={message.id} style={[styles.row, message.role === 'user' && styles.userRow]}>
      {message.role === 'assistant' && <ProfessorAvatar professor={professor} size={30} />}
      <View style={[styles.message, message.role === 'assistant' ? styles.assistantMessage : styles.userMessage]}>
        {message.role === 'assistant' && <Text style={styles.author}>{professor.name} 교수 AI</Text>}
        {message.role === 'assistant' ? <AnswerContent content={message.content} /> : <Text selectable style={styles.content}>{message.content}</Text>}
        {message.role === 'assistant' && <AnswerSources sources={message.sources} search={message.search} />}
        {message.status === 'failed' && <Text style={styles.failed}>전송 실패</Text>}
      </View>
    </View>)}
    {pending && <View style={styles.waiting} accessibilityLiveRegion="polite"><ActivityIndicator size="small" color={colors.blue} /><Text style={styles.waitingText}>교수 AI가 답변하고 있어요…</Text></View>}
    {retryable && !pending && <View style={styles.error} accessibilityLiveRegion="polite">
      <Text style={styles.errorText}>{error || '중단된 질문이 있어요. 다시 보내면 대화를 이어갈 수 있어요.'}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="실패한 질문 다시 보내기" onPress={onRetry} style={styles.retry}><Text style={styles.retryText}>다시 보내기</Text></Pressable>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  history: { width: '100%', maxWidth: 780, alignSelf: 'center', gap: 26 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 }, userRow: { justifyContent: 'flex-end' },
  message: { flexShrink: 1, maxWidth: '90%', paddingTop: 2 },
  assistantMessage: { flex: 1, minWidth: 0 },
  userMessage: { backgroundColor: '#EEF2FA', borderRadius: 18, paddingHorizontal: 18, paddingVertical: 13 },
  author: { fontFamily: fonts.medium, color: colors.ink, fontSize: 12, marginBottom: 8 },
  content: { fontFamily: fonts.regular, color: colors.ink, fontSize: 14, lineHeight: 25 },
  failed: { fontFamily: fonts.regular, fontSize: 10, color: '#B25858', marginTop: 6 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingLeft: 42 },
  waitingText: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  error: { borderRadius: 12, padding: 14, backgroundColor: '#FFF5F3', gap: 10 },
  errorText: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 21, color: '#AD5B4F' },
  retry: { alignSelf: 'flex-start', minHeight: 40, justifyContent: 'center', paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#FFFFFF' },
  retryText: { fontFamily: fonts.medium, color: colors.blue, fontSize: 12 },
});
