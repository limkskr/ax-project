import { expect, it } from 'vitest';
import { splitInlineMath } from './inline-math-layout';

it('moves a wide formula onto its own scroll line while retaining surrounding emphasis', () => {
  expect(splitInlineMath([
    { type: 'text', text: '식은 ' },
    { type: 'strong', children: [{ type: 'text', text: '먼저 ' }, { type: 'math', text: 'wide' }, { type: 'text', text: ' 이후' }] },
    { type: 'text', text: '입니다.' },
  ], text => text === 'wide')).toEqual([
    { type: 'inline', children: [{ type: 'text', text: '식은 ' }, { type: 'strong', children: [{ type: 'text', text: '먼저 ' }] }] },
    { type: 'math', text: 'wide' },
    { type: 'inline', children: [{ type: 'strong', children: [{ type: 'text', text: ' 이후' }] }, { type: 'text', text: '입니다.' }] },
  ]);
});

it('keeps the link target when a linked formula needs a scroll line', () => {
  expect(splitInlineMath([{ type: 'link', url: 'https://example.com/', children: [{ type: 'math', text: 'wide' }] }], () => true)).toEqual([
    { type: 'math', text: 'wide', url: 'https://example.com/' },
  ]);
});
