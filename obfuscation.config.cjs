// z e e e xshan: Optimized obfuscation configuration for Shop Analytics Dashboard
// Balanced protection with performance optimization

module.exports = {
  // Developer: z e e e xshan - Performance-optimized code protection
  compact: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5, // Reduced for performance
  deadCodeInjection: false, // Disabled for large files
  debugProtection: true,
  debugProtectionInterval: 2000,
  disableConsoleOutput: false, // Allow console for debugging if needed
  identifierNamesGenerator: 'hexadecimal',
  log: false,
  numbersToExpressions: false, // Disabled for performance
  renameGlobals: false,
  rotateStringArray: true,
  selfDefending: true,
  shuffleStringArray: true,
  splitStrings: false, // Disabled for large files
  stringArray: true,
  stringArrayCallsTransform: false, // Disabled for performance
  stringArrayEncoding: ['base64'],
  stringArrayIndexShift: true,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  stringArrayWrappersCount: 2, // Reduced for performance
  stringArrayWrappersChainedCalls: false,
  stringArrayWrappersParametersMaxCount: 2,
  stringArrayWrappersType: 'function',
  stringArrayThreshold: 0.5, // Reduced for performance
  transformObjectKeys: false, // Disabled for performance
  unicodeEscapeSequence: false,
  
  // z e e e xshan: Production-ready settings
  target: 'node',
  
  // Custom signature in obfuscated code
  seed: 'zeeexshan_shop_analytics_2024',
  
  // Performance optimizations
  sourceMap: false,
  sourceMapMode: 'separate'
};