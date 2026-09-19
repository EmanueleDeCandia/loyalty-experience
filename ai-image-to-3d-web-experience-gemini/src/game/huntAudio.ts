/**
 * Effetti sonori leggeri (WebAudio, nessun asset esterno) e micro-vibrazioni
 * per il mini-game "Caccia ai Tesori".
 */

import { TierId } from './treasureCatalog';

let audioContext: AudioContext | null = null;
let muted = false;

export function setHuntMuted(value: boolean): void {
  muted = value;
}

export function isHuntMuted(): boolean {
  return muted;
}

type AudioContextCtor = typeof AudioContext;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const ctor: AudioContextCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  if (!ctor) return null;

  if (!audioContext) {
    try {
      audioContext = new ctor();
    } catch {
      return null;
    }
  }

  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

interface ToneOptions {
  frequency: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
  sweepTo?: number;
}

function playTone({ frequency, duration, type = 'sine', gain = 0.08, delay = 0, sweepTo }: ToneOptions): void {
  if (muted) return;
  const ctx = getContext();
  if (!ctx) return;

  const startAt = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const envelope = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  if (sweepTo) {
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), startAt + duration);
  }

  envelope.gain.setValueAtTime(0.0001, startAt);
  envelope.gain.exponentialRampToValueAtTime(gain, startAt + 0.012);
  envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(envelope);
  envelope.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

/** Micro-vibrazione (ignorata sui dispositivi che non la supportano). */
export function vibrate(pattern: number | number[]): void {
  if (muted) return;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* no-op */
  }
}

/** Apertura della caccia: due note ascendenti. */
export function playHuntStart(): void {
  playTone({ frequency: 523.25, duration: 0.16, type: 'triangle', gain: 0.07 });
  playTone({ frequency: 783.99, duration: 0.22, type: 'triangle', gain: 0.07, delay: 0.14 });
}

/** Figurina trovata: blip che sale con il numero di tesori raccolti. */
export function playTreasureReveal(index: number, points: number): void {
  const base = 587.33 * Math.pow(1.06, Math.min(index, 8));
  playTone({ frequency: base, duration: 0.14, type: 'triangle', gain: 0.075 });
  playTone({
    frequency: base * 1.5,
    duration: 0.18,
    type: 'sine',
    gain: 0.05,
    delay: 0.07,
    sweepTo: base * (points >= 9 ? 2.6 : 1.9),
  });
}

/** Tick di countdown negli ultimi secondi. */
export function playHuntTick(secondsLeft: number): void {
  playTone({
    frequency: secondsLeft <= 3 ? 1180 : 880,
    duration: 0.07,
    type: 'square',
    gain: 0.035,
  });
}

/** Schermata finale: jingle diverso per tier. */
export function playHuntComplete(tier: TierId, isNewRecord: boolean): void {
  const sequences: Record<TierId, { notes: number[]; step: number }> = {
    none: { notes: [392, 349.23], step: 0.16 },
    silver: { notes: [523.25, 659.25, 783.99], step: 0.13 },
    gold: { notes: [523.25, 659.25, 783.99, 1046.5], step: 0.13 },
    platinum: { notes: [523.25, 659.25, 783.99, 1046.5, 1318.51], step: 0.12 },
    diamond: { notes: [587.33, 739.99, 880, 1174.66, 1479.98, 1760], step: 0.11 },
  };

  const { notes, step } = sequences[tier];
  notes.forEach((frequency, index) => {
    playTone({
      frequency,
      duration: 0.22,
      type: 'triangle',
      gain: 0.07,
      delay: index * step,
    });
  });

  if (isNewRecord) {
    playTone({ frequency: 1567.98, duration: 0.3, type: 'sine', gain: 0.05, delay: notes.length * step + 0.05 });
  }

  if (tier === 'platinum' || tier === 'diamond') {
    vibrate([24, 60, 24, 60, 40]);
  } else if (tier === 'none') {
    vibrate(40);
  } else {
    vibrate([18, 40, 18]);
  }
}
