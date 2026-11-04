import { decode } from 'html-entities';
import { Marked, type Token, type Tokens } from 'marked';

export type AnswerInline =
  | { type: 'text' | 'code' | 'math'; text: string }
  | { type: 'strong' | 'em' | 'strike'; children: AnswerInline[] }
  | { type: 'link'; url: string | null; children: AnswerInline[] };

export type AnswerBlock =
  | { type: 'paragraph'; children: AnswerInline[] }
  | { type: 'heading'; level: number; children: AnswerInline[] }
  | { type: 'quote'; children: AnswerBlock[] }
  | { type: 'list'; ordered: boolean; start: number; items: { checked?: boolean; children: AnswerBlock[] }[] }
  | { type: 'table'; align: ('left' | 'center' | 'right' | null)[]; header: AnswerInline[][]; rows: AnswerInline[][][] }
  | { type: 'code'; text: string; language: string }
  | { type: 'math'; text: string }
  | { type: 'rule' };

// Extensions run inside the lexer, so code fences, inline code and escaped
// dollar signs keep Markdown's normal behavior. Never rewrite the source text.
const markdown = new Marked({ gfm: true, breaks: true }, {
  extensions: [
    {
      // CommonMark treats punctuation before a Korean particle as an invalid
      // closing delimiter. LLM answers commonly use **"용어"**로 in Korean.
      name: 'strong', level: 'inline',
      start: source => source.indexOf('**'),
      tokenizer(source) {
        if (!source.startsWith('**') || /\s/.test(source[2] || ' ')) return;
        for (let index = 2; index < source.length; index++) {
          if (source[index] === '\n') return;
          if (source[index] === '\\') { index++; continue; }
          if (source[index] === '`') {
            const fence = /^`+/.exec(source.slice(index))![0];
            let close = source.indexOf(fence, index + fence.length);
            while (close >= 0 && (source[close - 1] === '`' || source[close + fence.length] === '`')) {
              close = source.indexOf(fence, close + fence.length);
            }
            if (close >= 0) { index = close + fence.length - 1; continue; }
          }
          if (source.slice(index, index + 2) === '**') {
            // Only the first closing delimiter belongs to this span.
            const text = source.slice(2, index);
            if (!/[가-힣]/.test(source[index + 2] || '') || text.trim() !== text) return;
            return { type: 'strong', raw: source.slice(0, index + 2), text, tokens: this.lexer.inlineTokens(text) };
          }
        }
      },
    },
    {
      name: 'math_block', level: 'block',
      start: source => source.match(/^ {0,3}(?:\$\$|\\\[)/m)?.index,
      tokenizer(source) {
        const match = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(source)
          || /^ {0,3}\\\[([\s\S]+?)\\\][ \t]*(?:\n|$)/.exec(source);
        if (match?.[1].trim()) return { type: 'math_block', raw: match[0], text: match[1].trim() };
      },
    },
    {
      name: 'math_inline', level: 'inline',
      start: source => source.match(/\$|\\\(/)?.index,
      tokenizer(source) {
        const match = /^\\\(([^\n]+?)\\\)/.exec(source)
          || /^\$(?![\s$])((?:\\.|[^\\\n$])+?)\$(?!\d)/.exec(source);
        if (match?.[1] && match[1].trim() === match[1]) {
          return { type: 'math_inline', raw: match[0], text: match[1] };
        }
      },
    },
  ],
});

export function getExternalLink(value: string): string | null {
  if (/[\u0000-\u0020\u007f]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch { return null; }
}

function inlineNodes(tokens: Token[]): AnswerInline[] {
  const nodes: AnswerInline[] = [];
  for (const token of tokens) {
    let node: AnswerInline;
    switch (token.type) {
      case 'strong': case 'em':
        node = { type: token.type, children: inlineNodes((token as Tokens.Strong).tokens) }; break;
      case 'del':
        node = { type: 'strike', children: inlineNodes((token as Tokens.Del).tokens) }; break;
      case 'link': {
        const link = token as Tokens.Link;
        node = { type: 'link', url: getExternalLink(decode(link.href)), children: inlineNodes(link.tokens) }; break;
      }
      case 'codespan': node = { type: 'code', text: (token as Tokens.Codespan).text }; break;
      case 'math_inline': node = { type: 'math', text: token.text as string }; break;
      case 'image': node = { type: 'text', text: (token as Tokens.Image).text || '이미지' }; break;
      case 'br': node = { type: 'text', text: '\n' }; break;
      case 'html': node = { type: 'text', text: token.raw }; break;
      default: node = { type: 'text', text: decode(('text' in token ? token.text as string : undefined) ?? token.raw) };
    }
    const previous = nodes.at(-1);
    if (previous?.type === 'text' && node.type === 'text') previous.text += node.text;
    else nodes.push(node);
  }
  return nodes;
}

function blockNodes(tokens: Token[]): AnswerBlock[] {
  return tokens.flatMap((token): AnswerBlock[] => {
    switch (token.type) {
      case 'space': case 'def': return [];
      case 'heading': {
        const heading = token as Tokens.Heading;
        return [{ type: 'heading', level: heading.depth, children: inlineNodes(heading.tokens) }];
      }
      case 'paragraph': case 'text':
        return [{ type: 'paragraph', children: token.tokens ? inlineNodes(token.tokens) : [{ type: 'text', text: decode(token.text as string) }] }];
      case 'blockquote': return [{ type: 'quote', children: blockNodes((token as Tokens.Blockquote).tokens) }];
      case 'list': {
        const list = token as Tokens.List;
        return [{ type: 'list', ordered: list.ordered, start: typeof list.start === 'number' ? list.start : 1,
          items: list.items.map(item => ({ checked: item.checked, children: blockNodes(item.tokens) })) }];
      }
      case 'table': {
        const table = token as Tokens.Table;
        return [{ type: 'table', align: table.align, header: table.header.map(cell => inlineNodes(cell.tokens)),
          rows: table.rows.map(row => row.map(cell => inlineNodes(cell.tokens))) }];
      }
      case 'code': {
        const code = token as Tokens.Code;
        if (code.lang?.toLowerCase() === 'math') return [{ type: 'math', text: code.text }];
        return [{ type: 'code', text: code.text, language: code.lang?.split(/\s/)[0] || '' }];
      }
      case 'math_block': return [{ type: 'math', text: token.text as string }];
      case 'hr': return [{ type: 'rule' }];
      // No HTML renderer or remote image fetch: untrusted content is just text.
      default: return [{ type: 'paragraph', children: [{ type: 'text', text: token.raw }] }];
    }
  });
}

export function parseAssistantContent(content: string): AnswerBlock[] {
  try { return blockNodes(markdown.lexer(content)); }
  catch { return [{ type: 'paragraph', children: [{ type: 'text', text: content }] }]; }
}
