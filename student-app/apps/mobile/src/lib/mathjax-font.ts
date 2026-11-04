import { MathJaxTexFont } from '@mathjax/mathjax-tex-font/js/svg.js';

// Metro's import-map support does not resolve MathJax's #default-font alias.
// Use the same bundled TeX paths for its default and explicit output font.
export const Font = { fontName: 'mathjax-tex', DefaultFont: MathJaxTexFont };
