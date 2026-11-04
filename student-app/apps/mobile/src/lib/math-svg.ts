import { mathjax } from '@mathjax/src/js/mathjax.js';
import { TeX } from '@mathjax/src/js/input/tex.js';
import { SVG } from '@mathjax/src/js/output/svg.js';
import { liteAdaptor } from '@mathjax/src/js/adaptors/liteAdaptor.js';
import { RegisterHTMLHandler } from '@mathjax/src/js/handlers/html.js';
import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js';
import { NoTags, TagsFactory } from '@mathjax/src/js/input/tex/Tags.js';
import NodeUtil from '@mathjax/src/js/input/tex/NodeUtil.js';
import type ParseOptions from '@mathjax/src/js/input/tex/ParseOptions.js';
import type { MmlNode } from '@mathjax/src/js/core/MmlTree/MmlNode.js';
import '@mathjax/src/js/input/tex/ams/AmsConfiguration.js';
import '@mathjax/src/js/input/tex/newcommand/NewcommandConfiguration.js';

export interface MathSvg { xml: string; widthEm: number; heightEm: number }
const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);
class CompactTags extends NoTags {
  constructor() {
    super();
    // Browser equation tags use full-width nested SVGs. Keep a tagged equation
    // self-contained so its number scrolls with the formula on a phone.
    this.enTag = (node, tag) => {
      const factory = this.configuration.nodeFactory;
      return factory.create('node', 'mrow', [node,
        factory.create('node', 'mspace', [], { width: '0.8em' }), ...tag.childNodes]);
    };
  }
}
TagsFactory.add('kit-compact', CompactTags);

function compactTableTags(options: unknown) {
  const { data } = options as { data: ParseOptions };
  const tables: MmlNode[] = [];
  data.root.walkTree(node => {
    if (node.isKind('mtable') && node.childNodes.some(row => row.isKind('mlabeledtr'))) tables.push(node);
  });
  const factory = data.nodeFactory;
  for (const table of tables) {
    if (String(table.attributes.get('width')).endsWith('%')) table.attributes.set('width', 'auto');
    const columns = Math.max(...table.childNodes.map(row => row.childNodes.length - (row.isKind('mlabeledtr') ? 1 : 0)));
    for (const row of [...table.childNodes]) {
      const tagged = row.isKind('mlabeledtr');
      const tag = tagged ? row.childNodes[0] : null;
      const cells = row.childNodes.slice(tagged ? 1 : 0);
      while (cells.length < columns) cells.push(factory.create('node', 'mtd', []));
      // AMS makes labeled rows directly, bypassing Tags.enTag. Put their tags
      // in an ordinary final column before inheritance/layout, so SVG needs
      // neither a full-width browser container nor a viewport rewrite.
      const label = factory.create('node', 'mtd', tag ? [
        factory.create('node', 'mspace', [], { width: '0.8em' }), ...tag.childNodes,
      ] : []);
      if (tag) NodeUtil.copyAttributes(tag, label);
      label.attributes.set('columnalign', 'right');
      const replacement = factory.create('node', 'mtr', [...cells, label]);
      NodeUtil.copyAttributes(row, replacement);
      table.replaceChild(replacement, row);
    }
  }
}
const cache = new Map<string, MathSvg | null>();
let cacheBytes = 0;

export function renderMathSvg(tex: string, display: boolean): MathSvg | null {
  const key = `${display ? 'block' : 'inline'}:${tex}`;
  if (cache.has(key)) return cache.get(key)!;
  let result: MathSvg | null = null;
  try {
    if (!tex.trim() || tex.length > 2048) return null;
    // Local font paths need neither a browser DOM nor runtime font downloads.
    // Each formula gets its own TeX state: \newcommand cannot leak to a reply.
    const input = new TeX({ packages: ['base', 'ams', 'newcommand'], tags: 'kit-compact', maxBuffer: 2048, maxMacros: 1000,
      formatError: (_jax: unknown, error: Error) => { throw error; } });
    input.postFilters.add(compactTableTags, -8);
    const document = mathjax.document('', {
      InputJax: input,
      OutputJax: new SVG({ fontData: new MathJaxTexFont(), fontCache: 'none',
        linebreaks: { inline: false }, displayOverflow: 'overflow' }),
    });
    const node = document.convert(tex, { display, em: 16, ex: 8, containerWidth: 1280 });
    const svg = adaptor.tags(node, 'svg')[0];
    if (svg) {
      const box = adaptor.getAttribute(svg, 'viewBox').split(/\s+/).map(Number);
      const xml = adaptor.outerHTML(svg);
      const widthEm = box[2] / 1000;
      const heightEm = box[3] / 1000;
      if (xml.length <= 100_000 && Number.isFinite(widthEm) && Number.isFinite(heightEm)
        && widthEm > 0 && widthEm <= 160 && heightEm > 0 && heightEm <= 30) {
        result = { xml, widthEm, heightEm };
      }
    }
  } catch { /* Malformed/unsupported TeX stays visible as its original text. */ }
  cache.set(key, result);
  cacheBytes += result?.xml.length ?? 0;
  while (cache.size > 64 || cacheBytes > 1_000_000) {
    const oldest = cache.keys().next().value!;
    cacheBytes -= cache.get(oldest)?.xml.length ?? 0;
    cache.delete(oldest);
  }
  return result;
}
