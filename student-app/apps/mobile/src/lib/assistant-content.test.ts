import { describe, expect, it } from 'vitest';
import { getExternalLink, parseAssistantContent } from './assistant-content';

// These fixtures catch dropped formatting during the Markdown → native document
// conversion, and math delimiters stealing code, ordinary currency, or links.
describe('assistant answer document', () => {
  it('keeps adjacent bold spans separate when only the second ends with a Korean particle', () => {
    expect(parseAssistantContent("**머신러닝 (ML)**: **'사과'**라는 과일입니다.")).toEqual([
      { type: 'paragraph', children: [
        { type: 'strong', children: [{ type: 'text', text: '머신러닝 (ML)' }] },
        { type: 'text', text: ': ' },
        { type: 'strong', children: [{ type: 'text', text: "'사과'" }] },
        { type: 'text', text: '라는 과일입니다.' },
      ] },
    ]);
  });

  it('does not treat literal bold markers inside code as an emphasis boundary', () => {
    expect(parseAssistantContent('**`x**로`**를 사용합니다.')).toEqual([
      { type: 'paragraph', children: [
        { type: 'strong', children: [{ type: 'code', text: 'x**로' }] },
        { type: 'text', text: '를 사용합니다.' },
      ] },
    ]);
  });

  it('retains an ordered list that starts at zero', () => {
    expect(parseAssistantContent('0. 시작\n1. 다음')).toEqual([
      { type: 'list', ordered: true, start: 0, items: [
        { checked: undefined, children: [{ type: 'paragraph', children: [{ type: 'text', text: '시작' }] }] },
        { checked: undefined, children: [{ type: 'paragraph', children: [{ type: 'text', text: '다음' }] }] },
      ] },
    ]);
  });

  it('renders quoted emphasis immediately followed by a Korean particle', () => {
    expect(parseAssistantContent('AI와 ML은 **"포함 관계"**로 이해해요.')).toEqual([
      { type: 'paragraph', children: [
        { type: 'text', text: 'AI와 ML은 ' },
        { type: 'strong', children: [{ type: 'text', text: '"포함 관계"' }] },
        { type: 'text', text: '로 이해해요.' },
      ] },
    ]);
  });

  it('keeps heading emphasis and the cells of a Korean comparison table', () => {
    const document = parseAssistantContent('### **AI와 ML**\n\n| 구분 | 뜻 |\n| :--- | ---: |\n| AI | **인공지능** |\n| ML | 머신러닝 |');
    expect(document).toEqual([
      { type: 'heading', level: 3, children: [{ type: 'strong', children: [{ type: 'text', text: 'AI와 ML' }] }] },
      {
        type: 'table', align: ['left', 'right'],
        header: [[{ type: 'text', text: '구분' }], [{ type: 'text', text: '뜻' }]],
        rows: [
          [[{ type: 'text', text: 'AI' }], [{ type: 'strong', children: [{ type: 'text', text: '인공지능' }] }]],
          [[{ type: 'text', text: 'ML' }], [{ type: 'text', text: '머신러닝' }]],
        ],
      },
    ]);
  });

  it('supports the dollar and backslash math delimiters inside a sentence', () => {
    expect(parseAssistantContent(String.raw`식 $E=mc^2$와 \(x_i\)입니다.`)).toEqual([
      { type: 'paragraph', children: [
        { type: 'text', text: '식 ' }, { type: 'math', text: 'E=mc^2' },
        { type: 'text', text: '와 ' }, { type: 'math', text: 'x_i' },
        { type: 'text', text: '입니다.' },
      ] },
    ]);
  });

  it('recognizes standalone formulas without consuming the following paragraph', () => {
    expect(parseAssistantContent(String.raw`$$
\frac{1}{2}
$$

\[x^2+y^2=z^2\]

설명`)).toEqual([
      { type: 'math', text: String.raw`\frac{1}{2}` },
      { type: 'math', text: 'x^2+y^2=z^2' },
      { type: 'paragraph', children: [{ type: 'text', text: '설명' }] },
    ]);
  });

  it('leaves escaped dollars, prices and formulas in code as literal text', () => {
    expect(parseAssistantContent('가격은 $5 또는 $10입니다. \\$20\n\n`$x^2$`\n\n```tex\n\\[x\\]\n```')).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: '가격은 $5 또는 $10입니다. $20' }] },
      { type: 'paragraph', children: [{ type: 'code', text: '$x^2$' }] },
      { type: 'code', language: 'tex', text: String.raw`\[x\]` },
    ]);
  });
});

describe('answer links', () => {
  it('decodes HTML entities in a Markdown link destination before opening it', () => {
    expect(parseAssistantContent('[학교](https://example.com/?x=1&amp;y=2)')).toEqual([
      { type: 'paragraph', children: [{ type: 'link', url: 'https://example.com/?x=1&y=2',
        children: [{ type: 'text', text: '학교' }] }] },
    ]);
  });

  it.each([
    ['https://www.kumoh.ac.kr/ko/index.do', 'https://www.kumoh.ac.kr/ko/index.do'],
    ['HTTPS://EXAMPLE.COM/path', 'https://example.com/path'],
    ['javascript:alert(1)', null], ['data:text/html,hello', null],
    ['file:///private/data', null], ['intent://example', null],
    ['https://example.com/\npath', null], ['not-a-url', null],
  ])('opens only a well-formed web link: %s', (input, expected) => {
    expect(getExternalLink(input)).toBe(expected);
  });
});
