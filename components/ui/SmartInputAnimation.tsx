/**
 * SmartInputAnimation — contextual JSON Lottie animations for SmartInput.
 * Uses WebView + lottie-web (CDN) to play the JSON files without any
 * native lottie library dependency.
 *
 * mode="ocr"     → OCR SCAN animation (receipt scanning)
 * mode="loading" → Transaction Loading animation (AI parsing)
 * mode="text"    → Text / copy-paste animation
 * mode="voice"   → Computer guy animation (voice transcription)
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';

import { useThemeColors } from '../../hooks/useThemeColors';

// ─── Animation JSON imports (Metro resolves these at bundle time) ─────

// eslint-disable-next-line @typescript-eslint/no-var-requires
const OCR_JSON        = require('../../assets/animations/ocr-scan.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const LOADING_JSON    = require('../../assets/animations/transaction-loading.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TEXT_JSON       = require('../../assets/animations/text-input.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const VOICE_JSON      = require('../../assets/animations/voice-note.json');

const ANIMATION_DATA: Record<SmartInputAnimationMode, object> = {
  ocr:     OCR_JSON,
  loading: LOADING_JSON,
  text:    TEXT_JSON,
  voice:   VOICE_JSON,
};

export type SmartInputAnimationMode = 'ocr' | 'loading' | 'text' | 'voice';

// ─── Size map ─────────────────────────────────────────────────────────

const SIZE_MAP: Record<SmartInputAnimationMode, number> = {
  ocr:     220,
  loading: 200,
  text:    200,
  voice:   220,
};

// ─── Build inline HTML ────────────────────────────────────────────────

function buildHTML(animationData: object, bg: string): string {
  const json = JSON.stringify(animationData);
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; background: ${bg}; overflow: hidden; }
    #anim { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="anim"></div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie.min.js"></script>
  <script>
    lottie.loadAnimation({
      container: document.getElementById('anim'),
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: ${json}
    });
  </script>
</body>
</html>`;
}

// ─── Props ────────────────────────────────────────────────────────────

interface SmartInputAnimationProps {
  mode: SmartInputAnimationMode;
  label?: string;
  sublabel?: string;
}

// ─── Component ───────────────────────────────────────────────────────

export function SmartInputAnimation({
  mode,
  label,
  sublabel,
}: SmartInputAnimationProps): React.ReactElement {
  const colors = useThemeColors();
  const size = SIZE_MAP[mode];

  const html = useMemo(
    () => buildHTML(ANIMATION_DATA[mode], colors.background),
    [mode, colors.background],
  );

  return (
    <View style={styles.container}>
      <WebView
        source={{ html }}
        style={{ width: size, height: size, backgroundColor: 'transparent' }}
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        originWhitelist={['*']}
        javaScriptEnabled
        mixedContentMode="always"
      />

      {label ? (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      ) : null}

      {sublabel ? (
        <Text style={[styles.sublabel, { color: colors.textSecondary }]}>
          {sublabel}
        </Text>
      ) : null}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
  sublabel: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 24,
  },
});
