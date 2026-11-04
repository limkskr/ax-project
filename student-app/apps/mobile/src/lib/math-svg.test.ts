import { expect, it } from 'vitest';
import { renderMathSvg } from './math-svg';

// A valid fraction must yield a sized, self-contained drawing rather than the
// raw LaTeX. This catches dropped font data or a broken SVG conversion path.
it('converts a fraction to a self-contained SVG at usable dimensions', () => {
  const formula = renderMathSvg(String.raw`\frac{1}{2}`, true);
  expect(formula).not.toBeNull();
  expect(formula?.xml).toContain('<svg');
  expect(formula?.xml).toContain('<path');
  expect(formula?.xml).not.toMatch(/<(?:script|image|a)\b/);
  expect(formula?.widthEm).toBeGreaterThan(0.3);
  expect(formula?.widthEm).toBeLessThan(3);
  expect(formula?.heightEm).toBeGreaterThan(1);
  expect(formula?.heightEm).toBeLessThan(4);
});

it('renders a numbered equation with a normal sized SVG viewport', () => {
  const formula = renderMathSvg(String.raw`\tag{1}x`, true);
  expect(formula).not.toBeNull();
  expect(formula?.xml).toMatch(/\bviewBox="[^"]+"/);
  expect(formula?.widthEm).toBeGreaterThan(1);
  expect(formula?.widthEm).toBeLessThan(100);
});

it.each([
  String.raw`\begin{align}x &= a\tag{1}\\y &= b\tag{2}\end{align}`,
  String.raw`\begin{multline}x + y\\= z\tag{1}\end{multline}`,
])('renders numbered multi-row equations in a self-contained sized viewport: %s', tex => {
  const formula = renderMathSvg(tex, true);
  expect(formula).not.toBeNull();
  expect(formula?.xml).toMatch(/\bviewBox="[^"]+"/);
  expect(formula?.xml).toContain('data-c="31"');
  expect(formula?.widthEm).toBeGreaterThan(1);
  expect(formula?.widthEm).toBeLessThan(50);
  expect(formula?.heightEm).toBeGreaterThan(2);
  expect(formula?.heightEm).toBeLessThan(10);
});

it('leaves invalid or external-resource TeX as text instead of a drawing', () => {
  expect(renderMathSvg(String.raw`\frac{1}{`, true)).toBeNull();
  expect(renderMathSvg(String.raw`\href{https://example.com}{x}`, false)).toBeNull();
  expect(renderMathSvg(String.raw`\includegraphics{https://example.com/x.svg}`, true)).toBeNull();
});

it('does not leak a custom macro from one formula to another reply', () => {
  expect(renderMathSvg(String.raw`\newcommand{\kitdemo}{x^2}\kitdemo`, false)).not.toBeNull();
  expect(renderMathSvg(String.raw`\kitdemo`, false)).toBeNull();
});
