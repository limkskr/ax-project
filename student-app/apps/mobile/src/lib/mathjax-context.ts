// React Native exposes window.navigator without browser appVersion/userAgent.
// MathJax's DOM-free renderer should use its non-browser context on native.
export const hasWindow = false;
export const isCJS = false;
export const context = { window: null, document: null, os: 'unknown', path: (file: string) => file };
