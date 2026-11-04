const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '#default-font/svg/default.js' && context.originModulePath.includes('@mathjax')) {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/lib/mathjax-font.ts') };
  }
  const resolved = context.resolveRequest(context, moduleName, platform);
  if (platform !== 'web' && resolved.type === 'sourceFile'
    && /@mathjax[/\\]src[/\\](?:mjs|cjs)[/\\]util[/\\]context\.js$/.test(resolved.filePath)) {
    return { type: 'sourceFile', filePath: path.join(__dirname, 'src/lib/mathjax-context.ts') };
  }
  return resolved;
};

module.exports = config;
