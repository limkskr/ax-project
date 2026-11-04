import type { AnswerInline } from './assistant-content';

export type InlineSegment = { type: 'inline'; children: AnswerInline[] } | { type: 'math'; text: string; url?: string | null };

export function splitInlineMath(nodes: AnswerInline[], overflows: (text: string) => boolean): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let children: AnswerInline[] = [];
  const flush = () => {
    if (children.length) segments.push({ type: 'inline', children });
    children = [];
  };
  for (const node of nodes) {
    if (node.type === 'math' && overflows(node.text)) {
      flush();
      segments.push({ type: 'math', text: node.text });
    } else if ('children' in node) {
      for (const child of splitInlineMath(node.children, overflows)) {
        if (child.type === 'inline') children.push({ ...node, children: child.children });
        else {
          flush();
          segments.push(node.type === 'link' ? { ...child, url: node.url } : child);
        }
      }
    } else children.push(node);
  }
  flush();
  return segments;
}
