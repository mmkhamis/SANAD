/**
 * Expo Config Plugin — withFixBundleScriptSpace
 *
 * React Native 0.81's "Bundle React Native code and images" script phase
 * ends with an unquoted backtick-eval:
 *
 *   `"$NODE_BINARY" --print "…react-native-xcode.sh"`
 *
 * When the project path contains a space (e.g. "/Users/you/Wallet App"),
 * the shell word-splits the printed path and fails with:
 *
 *   /Users/you/Wallet: No such file or directory
 *
 * This plugin rewrites that line to quote the command substitution, so the
 * resolved path survives spaces:
 *
 *   bash "$("$NODE_BINARY" --print "…react-native-xcode.sh")"
 */

const { withXcodeProject } = require('@expo/config-plugins');

// The xcode npm library stores shellScript with literal backslash-escaped
// quotes (pbxproj serialization format), so we match \" not ".
const UNSAFE_RE =
  /`\s*\\"\$NODE_BINARY\\"\s+--print\s+(\\"[^`]+\\")\s*`/;

function withFixBundleScriptSpace(config) {
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const scripts = proj.hash.project.objects['PBXShellScriptBuildPhase'] || {};
    for (const key of Object.keys(scripts)) {
      const phase = scripts[key];
      if (!phase || typeof phase !== 'object') continue;
      if (typeof phase.shellScript !== 'string') continue;
      if (!phase.shellScript.includes('react-native-xcode.sh')) continue;
      const match = phase.shellScript.match(UNSAFE_RE);
      if (match) {
        const printExpr = match[1]; // Already contains \"..\"
        const safe = `bash \\"$(\\"$NODE_BINARY\\" --print ${printExpr})\\"`;
        phase.shellScript = phase.shellScript.replace(UNSAFE_RE, safe);
      }
    }
    return mod;
  });
}

module.exports = withFixBundleScriptSpace;
