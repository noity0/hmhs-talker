/**
 * Web Audio Engine for Real-time Urdu Live AI Voice Calls
 * Handles ringtone generation, DTMF keypad tones, Gemini 24kHz PCM audio playback,
 * AnalyserNode live visualization, and SpeechSynthesis fallback.
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private ringtoneInterval: number | null = null;
  private ringtoneNodes: OscillatorNode[] = [];
  private currentSource: AudioBufferSourceNode | null = null;
  private isMuted: boolean = false;
  private onAudioLevelChange: ((level: number) => void) | null = null;
  private animationFrameId: number | null = null;

  public getAudioContext(): AudioContext {
    if (!this.ctx || this.ctx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getAnalyser(): AnalyserNode {
    const ctx = this.getAudioContext();
    if (!this.analyser) {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;
      this.startAnalyserLoop();
    }
    return this.analyser;
  }

  public setAudioLevelCallback(cb: ((level: number) => void) | null) {
    this.onAudioLevelChange = cb;
  }

  private startAnalyserLoop() {
    if (this.animationFrameId) return;

    const dataArray = new Uint8Array(64);
    const checkLevel = () => {
      if (this.analyser && this.onAudioLevelChange) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(1, avg / 128);
        this.onAudioLevelChange(normalized);
      }
      this.animationFrameId = requestAnimationFrame(checkLevel);
    };
    this.animationFrameId = requestAnimationFrame(checkLevel);
  }

  /**
   * Convert base64 16-bit PCM little-endian audio chunk to AudioBuffer
   */
  public base64PcmToAudioBuffer(base64Pcm: string, sampleRate = 24000): AudioBuffer {
    const ctx = this.getAudioContext();
    const binary = atob(base64Pcm);
    const length = Math.floor(binary.length / 2);
    const audioBuffer = ctx.createBuffer(1, length, sampleRate);
    const channelData = audioBuffer.getChannelData(0);

    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const dataView = new DataView(bytes.buffer);

    for (let i = 0; i < length; i++) {
      // 16-bit PCM signed integer little-endian
      const int16 = dataView.getInt16(i * 2, true);
      channelData[i] = int16 / 32768.0;
    }

    return audioBuffer;
  }

  /**
   * Plays PCM base64 audio and returns promise when finished
   */
  public async playPcmAudio(base64Pcm: string, filterMode: 'hd' | 'phone_speaker' = 'hd'): Promise<void> {
    this.stopSpeaking();
    const ctx = this.getAudioContext();
    const analyser = this.getAnalyser();

    try {
      const buffer = this.base64PcmToAudioBuffer(base64Pcm, 24000);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      if (filterMode === 'phone_speaker') {
        // Apply bandpass filter (300Hz to 3400Hz) to simulate classic phone receiver
        const biquadHigh = ctx.createBiquadFilter();
        biquadHigh.type = 'highpass';
        biquadHigh.frequency.value = 350;

        const biquadLow = ctx.createBiquadFilter();
        biquadLow.type = 'lowpass';
        biquadLow.frequency.value = 3200;

        source.connect(biquadHigh);
        biquadHigh.connect(biquadLow);
        biquadLow.connect(analyser);
        analyser.connect(ctx.destination);
      } else {
        source.connect(analyser);
        analyser.connect(ctx.destination);
      }

      this.currentSource = source;

      return new Promise<void>((resolve) => {
        source.onended = () => {
          this.currentSource = null;
          resolve();
        };
        source.start(0);
      });
    } catch (err) {
      console.error('Error playing PCM audio:', err);
    }
  }

  /**
   * SpeechSynthesis browser fallback for Urdu
   */
  public speakUrduFallback(text: string, personaGender: 'female' | 'male' = 'female', rate = 1.0): Promise<void> {
    this.stopSpeaking();
    return new Promise<void>((resolve) => {
      if (!('speechSynthesis' in window)) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ur-PK';
      utterance.rate = rate;
      utterance.pitch = personaGender === 'female' ? 1.15 : 0.9;

      const voices = window.speechSynthesis.getVoices();
      const urduVoice = voices.find(v => v.lang.startsWith('ur')) ||
                         voices.find(v => v.lang.startsWith('hi')) ||
                         voices.find(v => v.name.toLowerCase().includes('urdu') || v.name.toLowerCase().includes('pakistan'));

      if (urduVoice) {
        utterance.voice = urduVoice;
      }

      utterance.onend = () => {
        resolve();
      };
      utterance.onerror = () => {
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.currentSource) {
      try {
        this.currentSource.stop();
      } catch {}
      this.currentSource = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  /**
   * Realistic Telephone Ringing (Incoming Call Sound)
   */
  public startIncomingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();

    const playRingBurst = () => {
      try {
        // Standard telephone ring: 440Hz + 480Hz modulated
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.frequency.setValueAtTime(440, ctx.currentTime);
        osc2.frequency.setValueAtTime(480, ctx.currentTime);

        osc1.type = 'sine';
        osc2.type = 'sine';

        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.05);
        gainNode.gain.setValueAtTime(0.18, ctx.currentTime + 1.8);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2.0);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 2.0);
        osc2.stop(ctx.currentTime + 2.0);

        this.ringtoneNodes = [osc1, osc2];
      } catch (e) {
        console.warn('Ringtone error:', e);
      }
    };

    playRingBurst();
    this.ringtoneInterval = window.setInterval(playRingBurst, 3500);

    // Vibration API if on mobile device
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([1000, 800, 1000, 800]);
      } catch {}
    }
  }

  /**
   * Outgoing Ringing Cadence
   */
  public startOutgoingRingtone() {
    this.stopRingtone();
    const ctx = this.getAudioContext();

    const playTone = () => {
      try {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.frequency.setValueAtTime(400, ctx.currentTime);
        osc2.frequency.setValueAtTime(450, ctx.currentTime);

        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.setValueAtTime(0.08, ctx.currentTime + 1.0);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.1);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc2.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 1.1);
        osc2.stop(ctx.currentTime + 1.1);
      } catch {}
    };

    playTone();
    this.ringtoneInterval = window.setInterval(playTone, 3000);
  }

  public stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
    this.ringtoneNodes.forEach(node => {
      try { node.stop(); } catch {}
    });
    this.ringtoneNodes = [];
    if ('vibrate' in navigator) {
      try { navigator.vibrate(0); } catch {}
    }
  }

  /**
   * Call Connect Chime
   */
  public playConnectSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } catch {}
  }

  /**
   * Call End Tone
   */
  public playEndCallSound() {
    try {
      const ctx = this.getAudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(480, ctx.currentTime);
      osc.frequency.setValueAtTime(360, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  }

  /**
   * DTMF Keypad Tone
   */
  public playKeypadTone(key: string) {
    const dtmfFreqs: Record<string, [number, number]> = {
      '1': [697, 1209], '2': [697, 1336], '3': [697, 1477],
      '4': [770, 1209], '5': [770, 1336], '6': [770, 1477],
      '7': [852, 1209], '8': [852, 1336], '9': [852, 1477],
      '*': [941, 1209], '0': [941, 1336], '#': [941, 1477],
    };

    const freqs = dtmfFreqs[key];
    if (!freqs) return;

    try {
      const ctx = this.getAudioContext();
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.frequency.value = freqs[0];
      osc2.frequency.value = freqs[1];

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.15);
      osc2.stop(ctx.currentTime + 0.15);
    } catch {}
  }
}

export const audioEngine = new AudioEngine();
