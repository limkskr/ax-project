import { memo, useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type StyleProp, type TextStyle } from 'react-native';
import * as Linking from 'expo-linking';
import { SvgXml } from 'react-native-svg';
import { parseAssistantContent, type AnswerBlock, type AnswerInline } from '../lib/assistant-content';
import { renderMathSvg } from '../lib/math-svg';
import { splitInlineMath } from '../lib/inline-math-layout';
import { colors, fonts } from '../theme';

const codeFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

function openAnswerLink(url: string) {
  void Linking.openURL(url).catch(() => Alert.alert('링크를 열 수 없어요', '주소를 확인한 뒤 다시 시도해 주세요.'));
}

const Formula = memo(function Formula({ text, display = false, scroll = false }: { text: string; display?: boolean; scroll?: boolean }) {
  const { fontScale } = useWindowDimensions();
  const formula = useMemo(() => renderMathSvg(text, display), [text, display]);
  if (!formula) return <Text selectable style={styles.codeInline}>{text}</Text>;
  const size = (display ? 17 : 15) * fontScale;
  const drawing = <SvgXml xml={formula.xml} width={Math.ceil(formula.widthEm * size)}
    height={Math.ceil(formula.heightEm * size)} color={colors.ink} fontFamily={fonts.regular}
    accessibilityRole="image" accessibilityLabel={`수식: ${text}`} />;
  if (!display && !scroll) return drawing;
  return <View style={styles.formulaBlock}>
    <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled
      contentContainerStyle={styles.formulaScroll}>{drawing}</ScrollView>
  </View>;
});

function Inline({ nodes, italic = false }: { nodes: AnswerInline[]; italic?: boolean }) {
  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text': return node.text;
      case 'strong': return <Text key={index} style={[styles.strong, italic && styles.em]}><Inline nodes={node.children} italic={italic} /></Text>;
      case 'em': return <Text key={index} style={styles.em}><Inline nodes={node.children} italic /></Text>;
      case 'strike': return <Text key={index} style={styles.strike}><Inline nodes={node.children} italic={italic} /></Text>;
      case 'code': return <Text key={index} style={styles.codeInline}>{node.text}</Text>;
      case 'math': return <Formula key={index} text={node.text} />;
      case 'link': {
        if (!node.url) return <Text key={index}><Inline nodes={node.children} italic={italic} /></Text>;
        const url = node.url;
        return <Text key={index} accessibilityRole="link" accessibilityHint="브라우저에서 링크 열기"
          onPress={() => openAnswerLink(url)}
          style={styles.link}><Inline nodes={node.children} italic={italic} /></Text>;
      }
    }
  });
}

function TextFlow({ nodes, width, textStyle, heading = false }: {
  nodes: AnswerInline[]; width: number; textStyle?: StyleProp<TextStyle>; heading?: boolean;
}) {
  const { fontScale } = useWindowDimensions();
  const segments = useMemo(() => splitInlineMath(nodes,
    text => (renderMathSvg(text, false)?.widthEm ?? 0) * 15 * fontScale > width), [nodes, width, fontScale]);
  return <View style={styles.textFlow}>{segments.map((segment, index) => {
    if (segment.type === 'inline') return <Text key={index} selectable accessibilityRole={heading ? 'header' : undefined}
      style={[styles.body, textStyle]}><Inline nodes={segment.children} /></Text>;
    if (segment.url) return <Pressable key={index} accessibilityRole="link" onPress={() => openAnswerLink(segment.url!)}>
      <Formula text={segment.text} scroll />
    </Pressable>;
    return <Formula key={index} text={segment.text} scroll />;
  })}</View>;
}

function AnswerTable({ table, width }: { table: Extract<AnswerBlock, { type: 'table' }>; width: number }) {
  const columnWidth = Math.max(112, (width - 2) / Math.max(table.header.length, 1));
  const row = (cells: AnswerInline[][], header: boolean, key: string) => <View key={key}
    style={[styles.tableRow, header && styles.tableHeader]}>
    {cells.map((cell, index) => <View key={index} style={[styles.tableCell, { width: columnWidth }, index > 0 && styles.cellDivider]}>
      <TextFlow nodes={cell} width={columnWidth - 24} textStyle={[styles.cellText, { textAlign: table.align[index] || 'left' }, header && styles.strong]} />
    </View>)}
  </View>;
  return <View>
    {columnWidth * table.header.length > width && <Text style={styles.scrollHint}>표를 좌우로 넘겨 볼 수 있어요</Text>}
    <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled style={styles.tableScroll}>
      <View style={styles.table}>
        {row(table.header, true, 'header')}
        {table.rows.map((cells, index) => row(cells, false, `row-${index}`))}
      </View>
    </ScrollView>
  </View>;
}

function Blocks({ blocks, width }: { blocks: AnswerBlock[]; width: number }) {
  return <View style={styles.blocks}>{blocks.map((block, index) => {
    switch (block.type) {
      case 'paragraph': return <TextFlow key={index} nodes={block.children} width={width} />;
      case 'heading': {
        const size = [24, 21, 18, 16, 15, 14][block.level - 1] || 16;
        return <TextFlow key={index} nodes={block.children} width={width} heading
          textStyle={[styles.heading, { fontSize: size, lineHeight: size + 10 }]} />;
      }
      case 'quote': return <View key={index} style={styles.quote}><Blocks blocks={block.children} width={Math.max(width - 30, 112)} /></View>;
      case 'rule': return <View key={index} style={styles.rule} />;
      case 'math': return <Formula key={index} text={block.text} display />;
      case 'table': return <AnswerTable key={index} table={block} width={width} />;
      case 'list': return <View key={index} style={styles.list}>{block.items.map((item, itemIndex) => <View key={itemIndex} style={styles.listItem}>
        <Text style={[styles.body, styles.listMarker]}>{item.checked !== undefined ? (item.checked ? '☑' : '☐') : block.ordered ? `${block.start + itemIndex}.` : '•'}</Text>
        <View style={styles.listContent}><Blocks blocks={item.children} width={Math.max(width - 28, 112)} /></View>
      </View>)}</View>;
      case 'code': return <View key={index} style={styles.codeBlock}>
        {block.language ? <Text style={styles.codeLanguage}>{block.language}</Text> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator nestedScrollEnabled contentContainerStyle={styles.codeScroll}>
          <Text selectable style={styles.codeText}>{block.text}</Text>
        </ScrollView>
      </View>;
    }
  })}</View>;
}

export const AnswerContent = memo(function AnswerContent({ content }: { content: string }) {
  const { width: windowWidth } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const blocks = useMemo(() => parseAssistantContent(content), [content]);
  return <View style={styles.answer} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
    <Blocks blocks={blocks} width={width || Math.max(windowWidth - 82, 112)} />
  </View>;
});

const styles = StyleSheet.create({
  answer: { width: '100%', minWidth: 0 },
  blocks: { gap: 14 },
  textFlow: { gap: 6 },
  body: { fontFamily: fonts.regular, color: colors.ink, fontSize: 14, lineHeight: 25 },
  heading: { fontFamily: fonts.bold, marginTop: 4 },
  strong: { fontFamily: fonts.bold, fontWeight: '700' },
  // Noto Sans KR has no italic face; iOS does not synthesize one for a custom
  // font alias. Use the native system italic face for Markdown emphasis.
  em: { fontFamily: Platform.select({ ios: 'System', android: 'sans-serif', default: fonts.regular }), fontStyle: 'italic' },
  strike: { textDecorationLine: 'line-through' },
  link: { color: colors.blue, textDecorationLine: 'underline' },
  codeInline: { fontFamily: codeFont, fontSize: 13, color: colors.ink, backgroundColor: '#EEF1F6' },
  list: { gap: 10 }, listItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  listMarker: { minWidth: 22 }, listContent: { flex: 1, minWidth: 0 },
  quote: { borderLeftWidth: 3, borderLeftColor: '#C9D6F5', paddingLeft: 14, paddingVertical: 4 },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
  codeBlock: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: '#F4F6FA', overflow: 'hidden' },
  codeLanguage: { fontFamily: fonts.medium, fontSize: 10, color: colors.muted, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  codeScroll: { padding: 14 }, codeText: { fontFamily: codeFont, fontSize: 12, lineHeight: 20, color: colors.ink },
  tableScroll: { borderRadius: 10 }, table: { borderWidth: 1, borderColor: '#DEE5F0', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { backgroundColor: '#EEF3FC' }, tableRow: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DEE5F0' },
  tableCell: { paddingHorizontal: 12, paddingVertical: 10, justifyContent: 'center' },
  cellDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#DEE5F0' }, cellText: { fontSize: 13, lineHeight: 22 },
  scrollHint: { fontFamily: fonts.regular, color: colors.muted, fontSize: 10, marginBottom: 6 },
  formulaBlock: { backgroundColor: '#F6F8FC', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 14 },
  formulaScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center' },
});
