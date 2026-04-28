/**
 * ReactiveWaveform — fixed grid of vertical bars whose heights mirror
 * the most recent mic-level samples from the voice-input store.
 *
 * Newest samples appear on the right-hand edge (LTR) and shift left
 * as the recording continues, so the user sees their voice flowing.
 */

import React from 'react';
import { View } from 'react-native';

import { useVoiceInputStore } from '../../store/voice-input-store';
import { useThemeColors } from '../../hooks/useThemeColors';

interface ReactiveWaveformProps {
  /** Number of bars to render. Defaults to 32. */
  bars?: number;
  /** Max bar height in px. */
  height?: number;
  /** Bar width in px. */
  barWidth?: number;
  /** Gap between bars in px. */
  gap?: number;
  color?: string;
}

export function ReactiveWaveform({
  bars = 32,
  height = 96,
  barWidth = 4,
  gap = 4,
  color,
}: ReactiveWaveformProps): React.ReactElement {
  const colors = useThemeColors();
  const accent = color ?? colors.primary;

  const levels = useVoiceInputStore((s) => s.levels);

  // Down-sample the level buffer to the number of bars we want.
  const samples = sampleLevels(levels, bars);
  const minH = 4;

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        gap,
      }}
    >
      {samples.map((lvl, i) => {
        const h = Math.max(minH, lvl * height);
        const opacity = 0.4 + lvl * 0.6;
        return (
          <View
            key={i}
            style={{
              width: barWidth,
              height: h,
              borderRadius: barWidth / 2,
              backgroundColor: accent,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}

/**
 * Resample `levels` (variable length) into exactly `count` samples.
 * Tail-aligns so the most recent value lands in the rightmost bar.
 */
function sampleLevels(levels: number[], count: number): number[] {
  if (levels.length === 0) return Array(count).fill(0.05);
  if (levels.length === count) return levels;

  if (levels.length < count) {
    // Pad on the left with low values so the recent samples cluster right.
    return [...Array(count - levels.length).fill(0.05), ...levels];
  }

  // levels.length > count → take the last `count` items.
  return levels.slice(levels.length - count);
}
