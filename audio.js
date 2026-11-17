/**
 * Retro 8-bit Web Audio Synthesizer for Pixel Blackjack 21
 * Zero external audio files required — runs 100% offline.
 */
(function (global) {
  "use strict";

  class RetroAudio {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.bgmGain = null;
      this.sfxGain = null;
      this.bgmEnabled = true;
      this.sfxEnabled = true;
      this.isPlayingBgm = false;
      this._bgmTimer = null;
      this._step = 0;

      // Playful 8-bit casino ragtime loop (32 16th/8th steps in C major / A minor)
      this._melody = [
        523.25, 0, 659.25, 783.99, 880.0, 0, 783.99, 659.25,
        587.33, 659.25, 698.46, 0, 659.25, 587.33, 523.25, 0,
        440.0, 0, 523.25, 659.25, 783.99, 659.25, 587.33, 0,
        523.25, 587.33, 659.25, 783.99, 1046.5, 0, 783.99, 0,
      ];
      this._bass = [
        130.81, 0, 196.0, 0, 146.83, 0, 196.0, 0,
        174.61, 0, 196.0, 0, 130.81, 0, 196.0, 0,
        110.0, 0, 164.81, 0, 146.83, 0, 196.0, 0,
        130.81, 0, 196.0, 0, 130.81, 146.83, 164.81, 196.0,
      ];
    }

    ensureContext() {
      if (!this.ctx) {
        const AudioCtx = global.AudioContext || global.webkitAudioContext;
        if (!AudioCtx) return false;
        this.ctx = new AudioCtx();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.65;
        this.master.connect(this.ctx.destination);

        this.bgmGain = this.ctx.createGain();
        this.bgmGain.gain.value = this.bgmEnabled ? 0.16 : 0;
        this.bgmGain.connect(this.master);

        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.sfxEnabled ? 0.45 : 0;
        this.sfxGain.connect(this.master);
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return true;
    }

    setBgmEnabled(enabled) {
      this.bgmEnabled = !!enabled;
      if (this.bgmGain && this.ctx) {
        this.bgmGain.gain.setTargetAtTime(this.bgmEnabled ? 0.16 : 0, this.ctx.currentTime, 0.03);
      }
      if (this.bgmEnabled && !this.isPlayingBgm && this.ctx) {
        this.startBgm();
      } else if (!this.bgmEnabled && this.isPlayingBgm) {
        this.stopBgm();
      }
    }

    setSfxEnabled(enabled) {
      this.sfxEnabled = !!enabled;
      if (this.sfxGain && this.ctx) {
        this.sfxGain.gain.setTargetAtTime(this.sfxEnabled ? 0.45 : 0, this.ctx.currentTime, 0.02);
      }
    }

    _tone(freq, start, dur, type, vol, targetGain, slideTo) {
      if (!this.ctx || freq <= 0) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + dur);
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(vol, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(gain);
      gain.connect(targetGain);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }

    _noise(start, dur, vol, filterFreq, targetGain) {
      if (!this.ctx) return;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(filterFreq, start);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(targetGain);
      src.start(start);
      src.stop(start + dur + 0.02);
    }

    startBgm() {
      if (!this.bgmEnabled || this.isPlayingBgm) return;
      if (!this.ensureContext()) return;
      this.isPlayingBgm = true;
      const stepMs = 175;

      const tick = () => {
        if (!this.isPlayingBgm || !this.bgmEnabled) return;
        const now = this.ctx.currentTime + 0.02;
        const idx = this._step % this._melody.length;
        const mFreq = this._melody[idx];
        const bFreq = this._bass[idx];

        if (mFreq > 0) {
          this._tone(mFreq, now, 0.13, "square", 0.22, this.bgmGain);
        }
        if (bFreq > 0) {
          this._tone(bFreq, now, 0.16, "triangle", 0.42, this.bgmGain);
        }
        if (idx % 2 === 1) {
          this._noise(now, 0.04, 0.1, 5500, this.bgmGain);
        }
        this._step = (this._step + 1) % this._melody.length;
      };

      tick();
      this._bgmTimer = global.setInterval(tick, stepMs);
    }

    stopBgm() {
      this.isPlayingBgm = false;
      if (this._bgmTimer) {
        global.clearInterval(this._bgmTimer);
        this._bgmTimer = null;
      }
    }

    playClick() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(740, t, 0.05, "square", 0.22, this.sfxGain, 980);
    }

    playChip() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(1320, t, 0.045, "square", 0.25, this.sfxGain);
      this._tone(1760, t + 0.035, 0.06, "triangle", 0.28, this.sfxGain);
    }

    playCardDeal() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.075, 0.35, 1800, this.sfxGain);
      this._tone(260, t, 0.05, "triangle", 0.18, this.sfxGain, 140);
    }

    playCardFlip() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.06, 0.3, 2800, this.sfxGain);
      this._tone(440, t + 0.02, 0.07, "square", 0.18, this.sfxGain, 660);
    }

    playWin() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        this._tone(f, t + i * 0.08, 0.15, "square", 0.25, this.sfxGain);
      });
    }

    playBlackjack() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      const fanfare = [523.25, 659.25, 783.99, 1046.5, 987.77, 1046.5, 1318.51];
      fanfare.forEach((f, i) => {
        this._tone(f, t + i * 0.075, i === fanfare.length - 1 ? 0.35 : 0.12, "square", 0.28, this.sfxGain);
      });
    }

    playBust() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(311.13, t, 0.14, "sawtooth", 0.25, this.sfxGain, 220);
      this._tone(207.65, t + 0.13, 0.25, "sawtooth", 0.28, this.sfxGain, 110);
    }

    playPush() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(440, t, 0.1, "triangle", 0.28, this.sfxGain);
      this._tone(440, t + 0.13, 0.12, "triangle", 0.28, this.sfxGain);
    }

    playInsurance() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(587.33, t, 0.08, "square", 0.22, this.sfxGain);
      this._tone(880.0, t + 0.08, 0.11, "square", 0.22, this.sfxGain);
    }

    playCylinderSpin() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      for (let i = 0; i < 6; i++) {
        this._tone(900 + i * 70, t + i * 0.055, 0.035, "square", 0.18, this.sfxGain);
      }
    }

    playDryFire() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._tone(1400, t, 0.03, "square", 0.3, this.sfxGain, 620);
      this._noise(t, 0.035, 0.25, 3200, this.sfxGain);
    }

    playGunshot() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      this._noise(t, 0.32, 0.85, 220, this.sfxGain);
      this._tone(180, t, 0.18, "sawtooth", 0.45, this.sfxGain, 45);
      this._tone(95, t + 0.04, 0.26, "triangle", 0.4, this.sfxGain, 32);
    }

    playEliminated() {
      if (!this.sfxEnabled || !this.ensureContext()) return;
      const t = this.ctx.currentTime;
      const notes = [392.0, 349.23, 311.13, 261.63];
      notes.forEach((f, i) => {
        this._tone(f, t + i * 0.14, 0.22, "sawtooth", 0.26, this.sfxGain);
      });
    }
  }

  global.RetroAudio = new RetroAudio();
})(window);
