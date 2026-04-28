/**
 * Global voice input store — owns the Audio.Recording lifecycle so it can
 * survive route changes (recording continues while the user navigates).
 *
 * Lifecycle: idle → recording → transcribing → parsing → done | error
 *
 * Both the recording and processing UIs are minimizable. The store carries
 * a `minimized` flag; the host overlay decides whether to show the full
 * sheet or the bottom pill based on that flag.
 */

import { create } from 'zustand';
import { Audio } from 'expo-av';
import { deleteAsync } from 'expo-file-system/legacy';

import { transcribeVoiceNote } from '../services/smart-input-service';

// ─── Types ──────────────────────────────────────────────────────────

export type VoiceState =
  | 'idle'
  | 'recording'
  | 'transcribing'
  | 'parsing'
  | 'done'
  | 'error';

export type ProcessingStageState = 'done' | 'active' | 'pending';

interface VoiceInputStore {
  state: VoiceState;
  visible: boolean;
  minimized: boolean;

  // recording
  startedAt: number | null;
  elapsedMs: number;
  /** Ring buffer of normalized 0..1 mic levels — newest at the end. */
  levels: number[];

  // processing
  progress: number;
  /** Active stage index (0..3). */
  stageIndex: number;

  // result
  transcribedText: string | null;
  errorMessage: string | null;

  // actions
  startRecording: () => Promise<{ ok: boolean; error?: string }>;
  stopAndProcess: () => Promise<{ ok: boolean; text?: string; error?: string }>;
  cancel: () => Promise<void>;
  minimize: () => void;
  expand: () => void;
  dismiss: () => void;
  reset: () => void;
}

// ─── Module-scoped non-react state ──────────────────────────────────
// The Audio.Recording instance + intervals live outside the zustand
// store because they're not serializable and must survive setState calls.

let recordingRef: Audio.Recording | null = null;
let elapsedTimerId: ReturnType<typeof setInterval> | null = null;
let progressTimerId: ReturnType<typeof setInterval> | null = null;

const LEVEL_BUFFER_SIZE = 48;

function clearTimers(): void {
  if (elapsedTimerId) {
    clearInterval(elapsedTimerId);
    elapsedTimerId = null;
  }
  if (progressTimerId) {
    clearInterval(progressTimerId);
    progressTimerId = null;
  }
}

/** Maps an iOS dB metering value (-160..0) into a perceptual 0..1 level. */
function dbToLevel(db: number | undefined): number {
  if (db === undefined || db === null || !isFinite(db)) return 0.05;
  // Clamp dB into the audible range; -50 is near-silence, 0 is loudest.
  const clamped = Math.max(-50, Math.min(0, db));
  // Map -50..0 → 0..1 with a gentle curve so quiet-but-audible speech
  // produces visible bars instead of bottoming out.
  const normalized = (clamped + 50) / 50;
  return Math.max(0.05, Math.min(1, Math.pow(normalized, 1.4)));
}

const INITIAL_LEVELS: number[] = Array(LEVEL_BUFFER_SIZE).fill(0.05);

// ─── Store ──────────────────────────────────────────────────────────

export const useVoiceInputStore = create<VoiceInputStore>((set, get) => ({
  state: 'idle',
  visible: false,
  minimized: false,

  startedAt: null,
  elapsedMs: 0,
  levels: INITIAL_LEVELS,

  progress: 0,
  stageIndex: 0,

  transcribedText: null,
  errorMessage: null,

  startRecording: async () => {
    if (get().state === 'recording') {
      return { ok: true };
    }

    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        set({ state: 'error', errorMessage: 'mic_permission_denied', visible: true });
        return { ok: false, error: 'mic_permission_denied' };
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
        ios: {
          ...Audio.RecordingOptionsPresets.HIGH_QUALITY.ios,
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        },
        isMeteringEnabled: true,
      });

      // Hook up live metering — emits roughly every 100ms.
      recording.setProgressUpdateInterval(100);
      recording.setOnRecordingStatusUpdate((status) => {
        if (!status.isRecording) return;
        const lvl = dbToLevel(status.metering);
        const prev = get().levels;
        const next = prev.length >= LEVEL_BUFFER_SIZE
          ? [...prev.slice(1), lvl]
          : [...prev, lvl];
        set({ levels: next });
      });

      await recording.startAsync();
      recordingRef = recording;

      const startedAt = Date.now();
      set({
        state: 'recording',
        visible: true,
        minimized: false,
        startedAt,
        elapsedMs: 0,
        levels: INITIAL_LEVELS,
        progress: 0,
        stageIndex: 0,
        transcribedText: null,
        errorMessage: null,
      });

      // Tick elapsed time for the timer label.
      clearTimers();
      elapsedTimerId = setInterval(() => {
        const start = get().startedAt;
        if (start) set({ elapsedMs: Date.now() - start });
      }, 250);

      return { ok: true };
    } catch (err) {
      recordingRef = null;
      const msg = err instanceof Error ? err.message : 'unknown_error';
      set({ state: 'error', errorMessage: msg, visible: true });
      return { ok: false, error: msg };
    }
  },

  stopAndProcess: async () => {
    const rec = recordingRef;
    if (!rec) {
      set({ state: 'idle', visible: false });
      return { ok: false, error: 'no_recording' };
    }

    clearTimers();

    // Capture URI BEFORE stop — getURI() returns null on some devices after stop.
    const uri = rec.getURI();

    try {
      await rec.stopAndUnloadAsync().catch(() => {});
    } finally {
      recordingRef = null;
      Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: false,
      }).catch(() => {});
    }

    if (!uri) {
      set({ state: 'error', errorMessage: 'no_audio_uri' });
      return { ok: false, error: 'no_audio_uri' };
    }

    // ─── Move into transcribing stage ──────────────────────────────
    set({
      state: 'transcribing',
      progress: 8,
      stageIndex: 2, // 0:load, 1:clean (both auto-done), 2:transcribe (active)
    });

    // Animate progress slowly toward 80% during transcription so the bar
    // doesn't sit frozen on a long network call.
    progressTimerId = setInterval(() => {
      const p = get().progress;
      if (p >= 80) return;
      set({ progress: Math.min(80, p + 1.5) });
    }, 220);

    let text: string;
    try {
      text = await transcribeVoiceNote(uri);
    } catch (err) {
      clearTimers();
      try { await deleteAsync(uri, { idempotent: true }); } catch {}
      const msg = err instanceof Error ? err.message : 'transcription_failed';
      set({ state: 'error', errorMessage: msg, progress: 0 });
      return { ok: false, error: msg };
    } finally {
      try { await deleteAsync(uri, { idempotent: true }); } catch {}
    }

    if (progressTimerId) {
      clearInterval(progressTimerId);
      progressTimerId = null;
    }

    set({
      state: 'parsing',
      progress: 88,
      stageIndex: 3,
      transcribedText: text,
    });

    // The parsing step is owned by the smart-input screen (it needs the
    // categories/accounts hooks). Mark done here; the consumer flips to
    // 'done' once it has drafted the transactions.
    set({ progress: 100, state: 'done' });

    return { ok: true, text };
  },

  cancel: async () => {
    clearTimers();
    const rec = recordingRef;
    recordingRef = null;
    if (rec) {
      try {
        const uri = rec.getURI();
        await rec.stopAndUnloadAsync().catch(() => {});
        if (uri) {
          try { await deleteAsync(uri, { idempotent: true }); } catch {}
        }
      } catch {
        // already torn down
      }
    }
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: false,
    }).catch(() => {});

    set({
      state: 'idle',
      visible: false,
      minimized: false,
      startedAt: null,
      elapsedMs: 0,
      levels: INITIAL_LEVELS,
      progress: 0,
      stageIndex: 0,
      transcribedText: null,
      errorMessage: null,
    });
  },

  minimize: () => set({ minimized: true }),
  expand: () => set({ minimized: false, visible: true }),

  dismiss: () => {
    clearTimers();
    set({
      state: 'idle',
      visible: false,
      minimized: false,
      startedAt: null,
      elapsedMs: 0,
      levels: INITIAL_LEVELS,
      progress: 0,
      stageIndex: 0,
      transcribedText: null,
      errorMessage: null,
    });
  },

  reset: () => {
    clearTimers();
    recordingRef = null;
    set({
      state: 'idle',
      visible: false,
      minimized: false,
      startedAt: null,
      elapsedMs: 0,
      levels: INITIAL_LEVELS,
      progress: 0,
      stageIndex: 0,
      transcribedText: null,
      errorMessage: null,
    });
  },
}));
