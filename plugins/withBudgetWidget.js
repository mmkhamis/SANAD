/**
 * Expo Config Plugin — withBudgetWidget
 *
 * Adds an iOS WidgetKit extension target (BudgetWidgetExtension) to the
 * Xcode project during `npx expo prebuild`.
 *
 * What it does:
 * 1. Adds a bundle-id-derived App Group entitlement to the main app.
 * 2. Copies Swift widget source files into the ios/ directory.
 * 3. Creates a new app-extension target in the .xcodeproj with correct
 *    build settings, build phases, entitlements, and embedding.
 */

const {
  withXcodeProject,
  withEntitlementsPlist,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WIDGET_EXT_NAME = 'BudgetWidgetExtension';

// ── Helper: recursive directory copy ─────────────────────────────────

function copyDirRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Widget source directory not found: ${src}`);
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

// ── Step 1: App Group entitlement on main app ────────────────────────

function withAppGroupEntitlement(config) {
  return withEntitlementsPlist(config, (mod) => {
    const appGroup = `group.${config.ios.bundleIdentifier}`;
    const groups = mod.modResults['com.apple.security.application-groups'] || [];
    if (!groups.includes(appGroup)) {
      groups.push(appGroup);
    }
    mod.modResults['com.apple.security.application-groups'] = groups;
    return mod;
  });
}

// ── Step 2 & 3: Copy files + add Xcode target ───────────────────────

function withWidgetTarget(config) {
  return withXcodeProject(config, async (mod) => {
    const proj = mod.modResults;
    const projectRoot = mod.modRequest.projectRoot;
    const iosPath = path.join(projectRoot, 'ios');
    const bundleId = `${mod.ios.bundleIdentifier}.BudgetWidget`;
    const appGroup = `group.${mod.ios.bundleIdentifier}`;

    // ── Copy Swift files ───────────────────────────────────────────
    const sourceDir = path.join(projectRoot, 'targets', 'budget-widget');
    const widgetDir = path.join(iosPath, WIDGET_EXT_NAME);
    copyDirRecursive(sourceDir, widgetDir);

    const widgetSwiftPath = path.join(widgetDir, 'BudgetWidget.swift');
    const widgetEntitlementsPath = path.join(widgetDir, `${WIDGET_EXT_NAME}.entitlements`);
    if (fs.existsSync(widgetSwiftPath)) {
      const contents = fs.readFileSync(widgetSwiftPath, 'utf8');
      fs.writeFileSync(
        widgetSwiftPath,
        contents.replace(/group\.com\.wallet\.app/g, appGroup)
      );
    }
    if (fs.existsSync(widgetEntitlementsPath)) {
      const contents = fs.readFileSync(widgetEntitlementsPath, 'utf8');
      fs.writeFileSync(
        widgetEntitlementsPath,
        contents.replace(/group\.com\.wallet\.app/g, appGroup)
      );
    }

    // ── Add extension target ───────────────────────────────────────
    const target = proj.addTarget(
      WIDGET_EXT_NAME,
      'app_extension',
      WIDGET_EXT_NAME,
      bundleId,
    );

    // ── Source build phase ──────────────────────────────────────────
    proj.addBuildPhase(
      [
        'BudgetWidget.swift',
        'CommitmentsWidget.swift',
        'CharityWidget.swift',
        'WalletColors.swift',
        'BudgetWidgetBundle.swift',
      ],
      'PBXSourcesBuildPhase',
      'Sources',
      target.uuid,
    );

    // ── Resource build phase ───────────────────────────────────────
    proj.addBuildPhase(
      ['Assets.xcassets'],
      'PBXResourcesBuildPhase',
      'Resources',
      target.uuid,
    );

    // ── Framework build phase ──────────────────────────────────────
    proj.addBuildPhase(
      ['WidgetKit.framework', 'SwiftUI.framework'],
      'PBXFrameworksBuildPhase',
      'Frameworks',
      target.uuid,
    );

    // ── Build settings ─────────────────────────────────────────────
    const configs = proj.pbxXCBuildConfigurationSection();
    for (const key in configs) {
      const bc = configs[key];
      if (!bc.buildSettings) continue;

      const productName = bc.buildSettings.PRODUCT_NAME;
      if (
        productName === `"${WIDGET_EXT_NAME}"` ||
        productName === WIDGET_EXT_NAME
      ) {
        Object.assign(bc.buildSettings, {
          SWIFT_VERSION: '5.0',
          IPHONEOS_DEPLOYMENT_TARGET: '17.0',
          TARGETED_DEVICE_FAMILY: '"1"',
          CODE_SIGN_ENTITLEMENTS: `"${WIDGET_EXT_NAME}/${WIDGET_EXT_NAME}.entitlements"`,
          CODE_SIGN_STYLE: '"Automatic"',
          INFOPLIST_FILE: `"${WIDGET_EXT_NAME}/Info.plist"`,
          GENERATE_INFOPLIST_FILE: 'NO',
          CURRENT_PROJECT_VERSION: '1',
          MARKETING_VERSION: '"1.0"',
          PRODUCT_BUNDLE_IDENTIFIER: `"${bundleId}"`,
          ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME: '"AccentColor"',
          ASSETCATALOG_COMPILER_WIDGET_BACKGROUND_COLOR_NAME: '"WidgetBackground"',
          LD_RUNPATH_SEARCH_PATHS: `"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"`,
          SWIFT_EMIT_LOC_STRINGS: 'YES',
          SKIP_INSTALL: 'YES',
        });
      }
    }

    // ── Embed extension in main app ────────────────────────────────
    const mainTarget = proj.getFirstTarget();
    proj.addBuildPhase(
      [`${WIDGET_EXT_NAME}.appex`],
      'PBXCopyFilesBuildPhase',
      'Embed Foundation Extensions',
      mainTarget.uuid,
      'plugins', // dstSubfolderSpec = 13 → PlugIns folder
    );

    // ── Add file group to project navigator ────────────────────────
    const group = proj.addPbxGroup(
      [
        'BudgetWidget.swift',
        'CommitmentsWidget.swift',
        'CharityWidget.swift',
        'WalletColors.swift',
        'BudgetWidgetBundle.swift',
        'Assets.xcassets',
        'Info.plist',
        `${WIDGET_EXT_NAME}.entitlements`,
      ],
      WIDGET_EXT_NAME,
      WIDGET_EXT_NAME,
    );

    const mainGroupId = proj.getFirstProject().firstProject.mainGroup;
    proj.addToPbxGroup(group.uuid, mainGroupId);

    return mod;
  });
}

// ── Compose plugin ───────────────────────────────────────────────────

function withBudgetWidget(config) {
  config = withAppGroupEntitlement(config);
  config = withWidgetTarget(config);
  return config;
}

module.exports = withBudgetWidget;
