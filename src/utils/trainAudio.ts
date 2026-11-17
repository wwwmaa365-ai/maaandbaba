// ============================================================================
// Web Audio API Synthesizer for "Recharge Expres" Indian Train Running Sound
// Produces:
// 1. Authentic Indian Railways Dual-Tone Express Horn (WAP-7 / Vande Bharat)
// 2. Accelerating "Chuk-Chuk / Tak-Tak" Steel Wheel-on-Rail Track Rhythm
// 3. Verified Payment Success Chime
// ============================================================================

class TrainAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playIndianTrainSuccessSound(): void {
    if (this.isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // 1. Indian Railways Dual-Tone Air Horn (2 blasts: short-long "Paa-Poooooo")
    this.playExpressHorn(ctx, now + 0.05, 0.38);
    this.playExpressHorn(ctx, now + 0.52, 0.85);

    // 2. Rhythmic Indian Train Running on Track ("Chuk-Chuk / Tak-Tak" accelerating)
    const chugCount = 18;
    let timeOffset = 0.05;
    for (let i = 0; i < chugCount; i++) {
      // Accelerating cadence from 0.22s down to 0.11s per beat
      const interval = Math.max(0.11, 0.22 - i * 0.006);
      const isAccent = i % 2 === 0;
      this.playTrackChug(ctx, now + timeOffset, isAccent, i / chugCount);
      // Add metallic rail-joint double click ("ta-dak") every 4th beat
      if (i % 4 === 1) {
        this.playRailJointClick(ctx, now + timeOffset + 0.02);
        this.playRailJointClick(ctx, now + timeOffset + 0.08);
      }
      timeOffset += interval;
    }

    // 3. Triumphant Fintech Recharge Confirmation Arpeggio at the end
    const chimeStart = now + 1.55;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 - E5 - G5 - C6
    notes.forEach((freq, idx) => {
      this.playBellNote(ctx, freq, chimeStart + idx * 0.11, 0.45);
    });
  }

  private playExpressHorn(ctx: AudioContext, startTime: number, duration: number) {
    // Indian WAP-7 / Express dual-chime frequencies (F#4 + A#4 + C#5 triad)
    const freqs = [369.99, 466.16, 554.37];
    const masterGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1350, startTime);

    masterGain.gain.setValueAtTime(0.001, startTime);
    masterGain.gain.linearRampToValueAtTime(0.16, startTime + 0.05);
    masterGain.gain.setValueAtTime(0.16, startTime + duration - 0.08);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.connect(filter);
      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  }

  private playTrackChug(
    ctx: AudioContext,
    startTime: number,
    isAccent: boolean,
    progress: number
  ) {
    const bufferSize = Math.floor(ctx.sampleRate * 0.075);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      const decay = Math.exp(-i / (bufferSize * 0.35));
      data[i] = (Math.random() * 2 - 1) * decay;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isAccent ? 380 + progress * 180 : 260 + progress * 120, startTime);
    filter.Q.setValueAtTime(2.4, startTime);

    const gain = ctx.createGain();
    const peak = isAccent ? 0.22 : 0.13;
    gain.gain.setValueAtTime(peak, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.07);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(startTime);
    noise.stop(startTime + 0.075);
  }

  private playRailJointClick(ctx: AudioContext, startTime: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(1100, startTime);
    osc.frequency.exponentialRampToValueAtTime(280, startTime + 0.025);

    gain.gain.setValueAtTime(0.09, startTime);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.028);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + 0.03);
  }

  private playBellNote(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number
  ) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.14, startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}

export const trainAudio = new TrainAudioEngine();
