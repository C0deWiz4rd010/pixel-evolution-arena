import { Injectable, signal } from '@angular/core';

export type AudioCueId = 'win' | 'loss' | 'evolve' | 'level-up' | 'item' | 'menu' | 'forge' | 'boss';

interface CueProfile {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
  /** Optional second tone for a quick arpeggio. */
  second?: number;
}

const CUE_PROFILES: Record<AudioCueId, CueProfile> = {
  win: { frequency: 660, duration: 0.22, type: 'square', gain: 0.05, second: 990 },
  loss: { frequency: 140, duration: 0.32, type: 'sawtooth', gain: 0.04 },
  evolve: { frequency: 880, duration: 0.34, type: 'triangle', gain: 0.045, second: 1320 },
  'level-up': { frequency: 740, duration: 0.18, type: 'sine', gain: 0.04, second: 1100 },
  item: { frequency: 520, duration: 0.16, type: 'sine', gain: 0.04 },
  menu: { frequency: 320, duration: 0.08, type: 'square', gain: 0.025 },
  forge: { frequency: 300, duration: 0.2, type: 'square', gain: 0.045, second: 450 },
  boss: { frequency: 110, duration: 0.5, type: 'sawtooth', gain: 0.05, second: 220 },
};

/** A short looping chiptune bassline + arpeggio assembled at runtime (no files). */
const MUSIC_BPM = 104;
const MUSIC_BASS: number[] = [130.81, 130.81, 174.61, 196.0, 146.83, 146.83, 196.0, 110.0];
const MUSIC_ARP: number[] = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 783.99, 880.0];

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly enabled = signal(false);
  readonly musicEnabled = signal(false);
  readonly masterVolume = signal(0.7);

  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private musicStep = 0;

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value) {
      this.stopMusic();
      if (this.context) {
        try {
          this.context.suspend();
        } catch {
          // ignore — best-effort
        }
      }
    }
  }

  setMasterVolume(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.masterVolume.set(clamped);
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(clamped, this.context.currentTime, 0.05);
    }
  }

  toggle(): boolean {
    const next = !this.enabled();
    this.setEnabled(next);
    return next;
  }

  play(cue: AudioCueId): void {
    if (!this.enabled()) {
      return;
    }

    const context = this.ensureContext();
    if (!context || !this.masterGain) {
      return;
    }

    const profile = CUE_PROFILES[cue];
    this.tone(context, profile.frequency, profile.type, profile.gain, profile.duration, 0);
    if (profile.second) {
      this.tone(context, profile.second, profile.type, profile.gain * 0.8, profile.duration * 0.8, profile.duration * 0.4);
    }
  }

  /** Toggles the procedural background loop (independent of SFX enable). */
  toggleMusic(): boolean {
    const next = !this.musicEnabled();
    this.musicEnabled.set(next);
    if (next) {
      this.startMusic();
    } else {
      this.stopMusic();
    }
    return next;
  }

  private startMusic(): void {
    const context = this.ensureContext();
    if (!context || !this.masterGain || this.musicTimer) {
      return;
    }
    if (!this.musicGain) {
      this.musicGain = context.createGain();
      this.musicGain.gain.value = 0.5;
      this.musicGain.connect(this.masterGain);
    }
    this.musicStep = 0;
    const stepMs = (60_000 / MUSIC_BPM) / 2; // eighth notes
    this.musicTimer = setInterval(() => this.musicTick(), stepMs);
  }

  private musicTick(): void {
    const context = this.context;
    if (!context || !this.musicGain) {
      return;
    }
    const step = this.musicStep % 8;
    const bass = MUSIC_BASS[step];
    const arp = MUSIC_ARP[step];
    this.tone(context, bass, 'triangle', 0.05, 0.26, 0, this.musicGain);
    if (step % 2 === 0) {
      this.tone(context, arp, 'square', 0.022, 0.16, 0.02, this.musicGain);
    }
    this.musicStep += 1;
  }

  private stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  private tone(
    context: AudioContext,
    frequency: number,
    type: OscillatorType,
    gainValue: number,
    duration: number,
    delay: number,
    destination?: GainNode,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;

    const start = context.currentTime + delay;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    oscillator.connect(gain);
    gain.connect(destination ?? this.masterGain ?? context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private ensureContext(): AudioContext | null {
    if (typeof globalThis === 'undefined') {
      return null;
    }

    const ctor: typeof AudioContext | undefined =
      (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!ctor) {
      return null;
    }

    if (!this.context) {
      try {
        this.context = new ctor();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.masterVolume();
        this.masterGain.connect(this.context.destination);
      } catch {
        return null;
      }
    }

    if (this.context.state === 'suspended') {
      this.context.resume().catch(() => {
        // ignore — best-effort
      });
    }

    return this.context;
  }
}
