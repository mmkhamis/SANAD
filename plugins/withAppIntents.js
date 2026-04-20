/**
 * Expo Config Plugin — withAppIntents
 *
 * Adds the native "Log SMS in SANAD" App Intent to the iOS main app target.
 *
 * What it does:
 * 1. Adds `keychain-access-groups` entitlement to the main app for shared
 *    session storage with the App Intent runtime.
 * 2. Copies Swift sources from /targets/app-intents into ios/Wallet/AppIntents.
 * 3. Adds those Swift files to the main Wallet target's Sources build phase
 *    and project navigator group so Xcode compiles them.
 *
 * Notes:
 * - The intent runs in the MAIN app process (no extension), so we do NOT
 *   create a new Xcode target.
 * - Swift sources reference the App Group `group.com.sanad.app` and the
 *   shared Keychain service `com.sanad.app.session` — these MUST stay in
 *   sync with modules/widget-shared-data/ios/WidgetSharedDataModule.swift
 *   and services/native-session-bridge.ts.
 */

const {
  withXcodeProject,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_INTENT_DIR_NAME = 'AppIntents';
const SWIFT_FILES = [
  'SharedCredentials.swift',
  'SMSParser.swift',
  'LocalNotifier.swift',
  'IngestClient.swift',
  'LogSMSIntent.swift',
  'WalletAppShortcuts.swift',
];

// ── Helpers ───────────────────────────────────────────────────────────

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`App Intents source directory not found: ${src}`);
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ── Step 1: Keychain access group entitlement ────────────────────────

function withKeychainAccessGroup(config) {
  return withEntitlementsPlist(config, (mod) => {
    const bundleId = mod.ios && mod.ios.bundleIdentifier;
    if (!bundleId) return mod;
    const accessGroup = `$(AppIdentifierPrefix)${bundleId}`;
    const groups = mod.modResults['keychain-access-groups'] || [];
    if (!groups.includes(accessGroup)) {
      groups.push(accessGroup);
    }
    mod.modResults['keychain-access-groups'] = groups;
    return mod;
  });
}

// ── Step 2 & 3: Copy Swift + register with main target ───────────────

function withAppIntentSources(config) {
  const projectName = (config.modRequest && config.modRequest.projectName) || config.name;
  return withXcodeProject(config, (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios');
    // Resolve the actual main app folder inside ios/ (matches the Xcode project name).
    const mainTargetName = mod.modRequest.projectName || projectName || 'App';

    const sourceDir = path.join(projectRoot, 'targets', 'app-intents');
    const mainAppDir = path.join(iosPath, mainTargetName, APP_INTENT_DIR_NAME);
    copyDirRecursive(sourceDir, mainAppDir);

    const mainTarget = proj.getFirstTarget();
    if (!mainTarget) {
      throw new Error('withAppIntents: could not resolve main app target');
    }

    // Path used inside the Xcode project (relative to the main app group).
    const groupPath = `${mainTargetName}/${APP_INTENT_DIR_NAME}`;

    // Add a PBX group so the files appear in the navigator.
    const group = proj.addPbxGroup(SWIFT_FILES, APP_INTENT_DIR_NAME, groupPath);

    // Attach to the main app group (sibling of existing source files).
    const groups = proj.hash.project.objects['PBXGroup'];
    let mainAppGroupId = null;
    for (const key of Object.keys(groups)) {
      const g = groups[key];
      if (g && typeof g === 'object' && g.name === mainTargetName) {
        mainAppGroupId = key.split('_comment_')[0];
        break;
      }
    }
    const parentGroupId =
      mainAppGroupId || proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(group.uuid, parentGroupId);

    // Add each Swift file to the main target's Sources build phase.
    // The group already has path=groupPath, so pass only the filename to
    // avoid Xcode double-prefixing (SANAD/AppIntents/SANAD/AppIntents/...).
    for (const file of SWIFT_FILES) {
      try {
        proj.addSourceFile(file, { target: mainTarget.uuid }, group.uuid);
      } catch (err) {
        // Idempotent — ignore "already in project" errors on re-runs.
        if (!String(err.message || err).includes('already')) {
          throw err;
        }
      }
    }

    return mod;
  });
}

// ── Compose plugin ───────────────────────────────────────────────────

function withAppIntents(config) {
  config = withKeychainAccessGroup(config);
  config = withAppIntentSources(config);
  return config;
}

module.exports = withAppIntents;
