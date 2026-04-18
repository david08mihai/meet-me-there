const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Firebase 9+ ships .cjs modules Metro doesn't resolve by default.
config.resolver.sourceExts.push('cjs');

// Firebase's package.json "exports" field interacts poorly with Metro.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
