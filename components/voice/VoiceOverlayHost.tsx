/**
 * Lazy-mounted host for the voice-input overlays.
 *
 * The recording / processing / minimized-pill components together pull in
 * react-native-svg, reanimated SVG primitives, and ~1.4k lines of layout
 * code. None of it is needed for the home tab on cold boot — voice input
 * only activates after the user taps the FAB or holds the smart-input
 * button. Gating mount behind the voice-input store's state means the
 * imports happen on demand, which keeps the post-login render path lean.
 */

import React, { Suspense } from 'react';

import { useVoiceInputStore } from '../../store/voice-input-store';

const RecordingOverlay = React.lazy(() =>
  import('./RecordingOverlay').then((m) => ({ default: m.RecordingOverlay })),
);
const ProcessingOverlay = React.lazy(() =>
  import('./ProcessingOverlay').then((m) => ({ default: m.ProcessingOverlay })),
);
const MinimizedPill = React.lazy(() =>
  import('./MinimizedPill').then((m) => ({ default: m.MinimizedPill })),
);

export function VoiceOverlayHost(): React.ReactElement | null {
  const state = useVoiceInputStore((s) => s.state);

  // 'idle' is the only state where every overlay returns null anyway.
  // Bailing out here means the lazy chunks never get fetched on cold boot.
  if (state === 'idle') return null;

  return (
    <Suspense fallback={null}>
      <RecordingOverlay />
      <ProcessingOverlay />
      <MinimizedPill />
    </Suspense>
  );
}
