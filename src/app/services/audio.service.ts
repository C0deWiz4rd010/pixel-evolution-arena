import { Injectable, signal } from '@angular/core';

export type AudioCueId = 'win' | 'loss' | 'evolve' | 'level-up' | 'item' | 'menu';

interface CueProfile {
  frequency: number;
  duration: number;
  type: OscillatorType;
  gain: number;
}

const CUE_PROFILES: Record<AudioCueId, CueProfile> = {
  win: { frequency: 660, duration: 0.22, type: 'square', gain: 0.05 },
  loss: { frequency: 140, duration: 0.32, type: 'sawtooth', gain: 0.04 },
  evolve: { frequency: 880, duration: 0.34, type: 'triangle', gain: 0.045 },
  'level-up': { frequency: 740, duration: 0.18, type: 'sine', gain: 0.04 },
  item: { frequency: 520, duration: 0.16, type: 'sine', gain: 0.04 },
  menu: { frequency: 320, duration: 0.08, type: 'square', gain: 0.025 },
};

@Injectable({ providedIn: 'root' })
export class AudioService {
  readonly enabled = signal(false);

  private context: AudioContext | null = null;

  setEnabled(value: boolean): void {
    this.enabled.set(value);
    if (!value && this.context) {
      try {
        this.context.suspend();
      } catch {
        // ignore — best-effort
      }
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
    if (!context) {
      return;
    }

    const profile = CUE_PROFILES[cue];
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = profile.type;
    oscillator.frequency.value = profile.frequency;

    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(profile.gain, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }

  private ensureContext(): AudioContext | null {
    if (typeof globalThis === 'undefined') {
      return null;
    }

    const ctor: typeof AudioContext | undefined =
      (globalThis as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!ctor) {
      return null;
    }

    if (!this.context) {
      try {
        this.context = new ctor();
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
