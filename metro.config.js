const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// Block root-level Lottie source files that have spaces in their names.
// Metro can't build valid asset URLs for filenames with spaces, causing
// "Could not extract asset path from URL" errors. The actual animations
// are already in assets/animations/ with clean filenames.
const existingBlockList = Array.isArray(config.resolver?.blockList)
  ? config.resolver.blockList
  : config.resolver?.blockList
    ? [config.resolver.blockList]
    : [];

config.resolver = {
  ...config.resolver,
  blockList: [
    ...existingBlockList,
    /Computer guy sitting at a computer JSON\.json$/,
    /OCR SCAN animation\.json$/,
    /when texting or copy and paste\.json$/,
  ],
};

module.exports = withNativeWind(config, { input: './global.css' });
