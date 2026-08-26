/**
 * Speech Recognition and Microphone Audio Manager for Urdu Live Voice Call
 */

export interface SpeechListenerOptions {
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: any) => void;
  onSoundStart?: () => void;
  onSoundEnd?: () => void;
  continuous?: boolean;
}

class SpeechManager {
  private recognition: any = null;
  private isListening: boolean = false;
  private isSupported: boolean = false;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private mediaStream: MediaStream | null = null;
  private silenceTimer: number | null = null;
  private lastTranscript: string = '';
  private options: SpeechListenerOptions = {};

  constructor() {
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognitionClass) {
      this.isSupported = true;
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'ur-PK'; // Urdu (Pakistan)
      this.setupRecognitionHandlers();
    }
  }

  public getIsSupported(): boolean {
    return this.isSupported;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  private setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.options.onSoundStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (interim) {
        this.options.onInterimResult?.(interim);
        this.resetSilenceDetection(interim);
      }

      if (final) {
        this.lastTranscript = final;
        this.options.onFinalResult?.(final);
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.isListening = false;
        this.options.onError?.(event);
      } else if (event.error === 'no-speech') {
        // Safe to ignore or restart
      } else {
        this.options.onError?.(event);
      }
    };

    this.recognition.onend = () => {
      if (this.isListening) {
        // Auto restart if should be continuous
        try {
          this.recognition.start();
        } catch {
          this.isListening = false;
          this.options.onSoundEnd?.();
        }
      } else {
        this.options.onSoundEnd?.();
      }
    };
  }

  private resetSilenceDetection(currentTranscript: string) {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
    }
    // After 1.4s of silence following an utterance, trigger final if available
    this.silenceTimer = window.setTimeout(() => {
      if (currentTranscript && currentTranscript.trim().length > 1) {
        this.options.onFinalResult?.(currentTranscript.trim());
      }
    }, 1400);
  }

  public async startListening(options: SpeechListenerOptions) {
    this.options = options;
    this.lastTranscript = '';

    if (this.recognition) {
      try {
        this.isListening = true;
        this.recognition.start();
      } catch (e) {
        // Already started
      }
    }

    // Also request mic stream for audio visualizer / recording fallback
    try {
      if (!this.mediaStream) {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
      }
    } catch (micErr) {
      console.warn('Microphone permission notice:', micErr);
    }
  }

  public stopListening() {
    this.isListening = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }

  public async recordAudioSnippet(durationMs = 3500): Promise<string | null> {
    return new Promise(async (resolve) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks: Blob[] = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          stream.getTracks().forEach(t => t.stop());
          const blob = new Blob(chunks, { type: 'audio/webm' });
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64 || null);
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        };

        recorder.start();
        setTimeout(() => {
          if (recorder.state === 'recording') {
            recorder.stop();
          }
        }, durationMs);
      } catch {
        resolve(null);
      }
    });
  }
}

export const speechManager = new SpeechManager();
