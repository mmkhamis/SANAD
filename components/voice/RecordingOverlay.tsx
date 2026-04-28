/**
 * Full-screen recording sheet — appears on top of any tab while the
 * voice-input store is in 'recording' state and not minimized.
 *
 * Buttons: minimize (chevron-down), cancel (trash), stop (square).
 */

import React from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Trash2, Square } from 'lucide-react-native';

import { useVoiceInputStore } from '../../store/voice-input-store';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useT } from '../../lib/i18n';
import { ReactiveWaveform } from './ReactiveWaveform';
import { impactLight, impactMedium } from '../../utils/haptics';

function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
  return `${m}:${s}`;
}

export function RecordingOverlay(): React.ReactElement | null {
  const colors = useThemeColors();
  const t = useT();
  const insets = useSafeAreaInsets();
  const state = useVoiceInputStore((s) => s.state);
  const visible = useVoiceInputStore((s) => s.visible);
  const minimized = useVoiceInputStore((s) => s.minimized);
  const elapsedMs = useVoiceInputStore((s) => s.elapsedMs);
  const minimize = useVoiceInputStore((s) => s.minimize);
  const cancel = useVoiceInputStore((s) => s.cancel);
  const stopAndProcess = useVoiceInputStore((s) => s.stopAndProcess);

  // Recording UI now lives inside the global LiquidGlassFab (which morphs
  // into the listening state) — the full-screen sheet is no longer shown.
  // We keep this component mounted as a safety net for unexpected states.
  const showSheet = false;

  return (
    <Modal
      visible={showSheet}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => minimize()}
    >
      <View style={{ flex: 1, justifyContent: 'flex-end' }}>
        {/* Dim backdrop */}
        <Pressable
          onPress={() => { impactLight(); minimize(); }}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <LinearGradient
          colors={
            colors.isDark
              ? ['rgba(7,8,15,0.55)', 'rgba(7,8,15,0.92)']
              : ['rgba(245,243,250,0.55)', 'rgba(245,243,250,0.92)']
          }
          pointerEvents="none"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />

        {/* Sheet */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingTop: 14,
            paddingBottom: insets.bottom + 24,
            paddingHorizontal: 22,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {/* Drag handle / minimize tap target */}
          <Pressable
            onPress={() => { impactLight(); minimize(); }}
            hitSlop={20}
            style={{ alignItems: 'center', paddingBottom: 18 }}
          >
            <View
              style={{
                width: 38,
                height: 4,
                borderRadius: 4,
                backgroundColor: colors.border,
              }}
            />
          </Pressable>

          {/* Header row — title left, minimize button right */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 22,
            }}
          >
            <View>
              <Text style={{ fontSize: 19, fontWeight: '700', color: colors.textPrimary }}>
                {t('VOICE_RECORDING_TITLE' as any)}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {t('VOICE_RECORDING_SUB' as any)}
              </Text>
            </View>
            <Pressable
              onPress={() => { impactLight(); minimize(); }}
              accessibilityLabel="Minimize"
              hitSlop={10}
              style={({ pressed }) => ({
                width: 36,
                height: 36,
                borderRadius: 12,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.7 : 1,
              })}
            >
              <ChevronDown size={18} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>
          </View>

          {/* Waveform — responds to mic level */}
          <View
            style={{
              backgroundColor: colors.surfaceSecondary,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 24,
              paddingVertical: 28,
              paddingHorizontal: 16,
              marginBottom: 18,
            }}
          >
            <ReactiveWaveform bars={32} height={100} />
          </View>

          {/* Live timer + recording dot */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              marginBottom: 24,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: colors.expense,
              }}
            />
            <Text
              style={{
                fontSize: 18,
                fontWeight: '700',
                color: colors.textPrimary,
                fontVariant: ['tabular-nums'],
              }}
            >
              {formatElapsed(elapsedMs)}
            </Text>
          </View>

          {/* Action buttons */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 32,
            }}
          >
            <Pressable
              onPress={async () => { impactLight(); await cancel(); }}
              accessibilityLabel="Cancel"
              style={({ pressed }) => ({
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: colors.surfaceSecondary,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Trash2 size={22} color={colors.textSecondary} strokeWidth={2} />
            </Pressable>

            <Pressable
              onPress={async () => { impactMedium(); await stopAndProcess(); }}
              accessibilityLabel="Stop"
              style={({ pressed }) => ({
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.expense,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: pressed ? 0.85 : 1,
                shadowColor: colors.expense,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
              })}
            >
              <Square size={28} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
