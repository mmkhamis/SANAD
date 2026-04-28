/**
 * Floating pill above the tab bar — appears whenever the voice input
 * store is in 'recording' / 'transcribing' / 'parsing' AND minimized.
 * Tapping the pill restores the full sheet.
 */

import React, { useEffect } from 'react';
import { View, Text, Pressable, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic, Loader2, ChevronUp } from 'lucide-react-native';

import { useVoiceInputStore } from '../../store/voice-input-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { ReactiveWaveform } from './ReactiveWaveform';
import { impactLight } from '../../utils/haptics';

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function MinimizedPill(): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const router = useRouter();
  const state = useVoiceInputStore((s) => s.state);
  const minimized = useVoiceInputStore((s) => s.minimized);
  const elapsedMs = useVoiceInputStore((s) => s.elapsedMs);
  const progress = useVoiceInputStore((s) => s.progress);
  const transcribedText = useVoiceInputStore((s) => s.transcribedText);
  const expand = useVoiceInputStore((s) => s.expand);

  const isRecording = state === 'recording';
  const isProcessing = state === 'transcribing' || state === 'parsing';
  const isDone = state === 'done' && !!transcribedText;

  // Auto-route to smart-input the moment processing finishes — the screen
  // there reads the transcribed text from the store and runs the parser.
  useEffect(() => {
    if (isDone) {
      router.push('/(tabs)/smart-input?source=voice');
    }
  }, [isDone, router]);

  // Recording state is now rendered by the global LiquidGlassFab — keep
  // exactly one surface visible during voice noting, so suppress the pill.
  if (isRecording) return null;
  if (!isProcessing && !isDone) return null;
  // Hide the pill while the full sheet is showing (legacy paths).
  if (isProcessing && !minimized) return null;

  const accent = isRecording ? colors.expense : colors.primary;
  // Sit just above the tab bar (tab bar bottom is 24/14 + height 72).
  const bottomOffset = (Platform.OS === 'ios' ? 24 : 14) + 72 + 10;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        left: 14,
        right: 14,
        bottom: bottomOffset,
        zIndex: 100,
      }}
    >
      <Pressable
        onPress={() => { impactLight(); expand(); }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 18,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: colors.isDark ? 0.45 : 0.12,
          shadowRadius: 14,
          elevation: 8,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        {/* Status icon w/ live dot for recording */}
        <View style={{ position: 'relative' }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              backgroundColor: accent + '22',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isRecording ? (
              <Mic size={16} color={accent} strokeWidth={2} />
            ) : (
              <Loader2 size={16} color={accent} strokeWidth={2} />
            )}
          </View>
          {isRecording ? (
            <View
              style={{
                position: 'absolute',
                top: -1,
                right: -1,
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.expense,
                borderWidth: 1.5,
                borderColor: colors.surface,
              }}
            />
          ) : null}
        </View>

        {/* Middle: waveform when recording, label + progress when processing */}
        <View style={{ flex: 1 }}>
          {isRecording ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <ReactiveWaveform bars={20} height={22} barWidth={2.5} gap={2.5} color={accent} />
              </View>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  color: colors.textSecondary,
                  fontVariant: ['tabular-nums'],
                }}
              >
                {formatElapsed(elapsedMs)}
              </Text>
            </View>
          ) : (
            <View>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: colors.textPrimary,
                }}
              >
                {t('MINI_PROCESSING_LABEL' as any)}
              </Text>
              <View
                style={{
                  marginTop: 6,
                  height: 4,
                  borderRadius: 2,
                  backgroundColor: colors.surfaceSecondary,
                  overflow: 'hidden',
                }}
              >
                <View
                  style={{
                    height: '100%',
                    width: `${Math.max(4, Math.min(100, progress))}%`,
                    backgroundColor: accent,
                  }}
                />
              </View>
            </View>
          )}
        </View>

        <ChevronUp size={16} color={colors.textTertiary} strokeWidth={2} />
      </Pressable>
    </View>
  );
}
