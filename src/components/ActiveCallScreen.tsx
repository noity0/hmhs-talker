import React, { useState, useEffect, useRef } from 'react';
import {
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Sparkles,
  MessageSquare,
  Send,
  RotateCcw,
  Sliders,
  Grid,
  Languages,
  Subtitles,
  Activity,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Persona, TranscriptMessage, CallSettings } from '../types';
import { audioEngine } from '../utils/audioPlayer';
import { speechManager } from '../utils/speechRecognition';
import { QUICK_URDU_QUESTIONS } from '../data/personas';

interface ActiveCallScreenProps {
  persona: Persona;
  settings: CallSettings;
  onEndCall: (transcripts: TranscriptMessage[], durationSeconds: number) => void;
  onOpenKeypad: () => void;
  onOpenSettings: () => void;
}

export const ActiveCallScreen: React.FC<ActiveCallScreenProps> = ({
  persona,
  settings,
  onEndCall,
  onOpenKeypad,
  onOpenSettings,
}) => {
  // Call State
  const [duration, setDuration] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isHandsFree, setIsHandsFree] = useState<boolean>(settings.handsFreeMode);
  const [audioLevel, setAudioLevel] = useState<number>(0.1);
  const [lastAudioBase64, setLastAudioBase64] = useState<string | null>(null);

  // Transcripts & Messages
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [currentAiResponse, setCurrentAiResponse] = useState<{
    urduText: string;
    romanUrdu: string;
    englishTranslation: string;
  }>({
    urduText: persona.defaultGreetingUrdu,
    romanUrdu: persona.defaultGreetingRoman,
    englishTranslation: persona.defaultGreetingEnglish,
  });
  const [interimUserText, setInterimUserText] = useState<string>('');
  const [suggestedReplies, setSuggestedReplies] = useState<{ urdu: string; roman: string }[]>([
    { urdu: 'وعلیکم السلام! میں بالکل خیریت سے ہوں', roman: 'Wa Alaikum Assalam! Main bilkul theek hoon' },
    { urdu: 'آپ کا تعارف جاننا چاہتا ہوں', roman: 'Aap ka taaruf jaanna chahta hoon' },
    { urdu: 'آج مجھے آپ سے کچھ رہنمائی چاہیے', roman: 'Aaj mujhe aap se kuch rehnumai chahiye' },
  ]);

  // UI view controls
  const [showFullTranscript, setShowFullTranscript] = useState<boolean>(false);
  const [showTextKeyboard, setShowTextKeyboard] = useState<boolean>(false);
  const [textInput, setTextInput] = useState<string>('');
  const [selectedSubtitles, setSelectedSubtitles] = useState<{
    urdu: boolean;
    roman: boolean;
    english: boolean;
  }>({
    urdu: settings.showUrduScript,
    roman: settings.showRomanUrdu,
    english: settings.showEnglishTranslation,
  });

  const timerRef = useRef<number | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement>(null);
  const isSendingRef = useRef<boolean>(false);

  // Initialize Call & Timer
  useEffect(() => {
    // Start duration timer
    timerRef.current = window.setInterval(() => {
      setDuration(prev => prev + 1);
    }, 1000);

    // Bind Web Audio level callback for live reactive visuals
    audioEngine.setAudioLevelCallback((level) => {
      setAudioLevel(prev => (prev * 0.4 + level * 0.6));
    });

    // Speak initial AI greeting
    initiateGreeting();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      speechManager.stopListening();
      audioEngine.stopSpeaking();
      audioEngine.setAudioLevelCallback(null);
    };
  }, []);

  // Update speech listener based on state
  useEffect(() => {
    if (!isMuted && !isAiSpeaking && !isProcessing) {
      startListeningUser();
    } else {
      speechManager.stopListening();
    }
  }, [isMuted, isAiSpeaking, isProcessing, isHandsFree]);

  const initiateGreeting = async () => {
    setIsAiSpeaking(true);
    const greetingMsg: TranscriptMessage = {
      id: `ai-${Date.now()}`,
      sender: 'ai',
      urduText: persona.defaultGreetingUrdu,
      romanUrdu: persona.defaultGreetingRoman,
      englishTranslation: persona.defaultGreetingEnglish,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setTranscripts([greetingMsg]);

    // Fetch initial TTS audio or fallback
    try {
      const res = await fetch('/api/gemini/init-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personaId: persona.id }),
      });
      const data = await res.json();
      if (data.audioBase64) {
        setLastAudioBase64(data.audioBase64);
        await audioEngine.playPcmAudio(data.audioBase64, settings.audioFilter);
      } else {
        await audioEngine.speakUrduFallback(persona.defaultGreetingUrdu, persona.gender, settings.speechRate);
      }
    } catch (err) {
      await audioEngine.speakUrduFallback(persona.defaultGreetingUrdu, persona.gender, settings.speechRate);
    } finally {
      setIsAiSpeaking(false);
    }
  };

  const startListeningUser = () => {
    speechManager.startListening({
      onInterimResult: (transcript) => {
        setIsUserSpeaking(true);
        setInterimUserText(transcript);
      },
      onFinalResult: (transcript) => {
        setIsUserSpeaking(false);
        setInterimUserText('');
        if (transcript && transcript.trim().length > 0) {
          sendUserUtterance(transcript);
        }
      },
      onError: () => {
        setIsUserSpeaking(false);
      },
      onSoundStart: () => {
        setIsUserSpeaking(true);
      },
      onSoundEnd: () => {
        setIsUserSpeaking(false);
      },
    });
  };

  const sendUserUtterance = async (spokenText: string) => {
    if (!spokenText || spokenText.trim().length === 0 || isSendingRef.current) return;
    isSendingRef.current = true;

    speechManager.stopListening();
    audioEngine.stopSpeaking();
    setIsUserSpeaking(false);
    setIsProcessing(true);

    const userMsg: TranscriptMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      urduText: spokenText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setTranscripts(prev => [...prev, userMsg]);

    try {
      // Build past history
      const historyPayload = transcripts.map(t => ({
        role: t.sender === 'user' ? 'user' : 'assistant',
        text: t.urduText,
      }));

      const response = await fetch('/api/gemini/chat-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: spokenText,
          history: historyPayload,
          personaId: persona.id,
        }),
      });

      const data = await response.json();

      const aiReplyText = data.urduText || 'جی بالکل، میں سن رہی ہوں۔';
      const aiRoman = data.romanUrdu || '';
      const aiEng = data.englishTranslation || '';

      setCurrentAiResponse({
        urduText: aiReplyText,
        romanUrdu: aiRoman,
        englishTranslation: aiEng,
      });

      if (data.suggestedRepliesUrdu && data.suggestedRepliesUrdu.length > 0) {
        setSuggestedReplies(
          data.suggestedRepliesUrdu.map((u: string, idx: number) => ({
            urdu: u,
            roman: data.suggestedRepliesRoman?.[idx] || '',
          }))
        );
      }

      const aiMsg: TranscriptMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        urduText: aiReplyText,
        romanUrdu: aiRoman,
        englishTranslation: aiEng,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setTranscripts(prev => [...prev, aiMsg]);

      // Play audio response
      setIsProcessing(false);
      setIsAiSpeaking(true);

      if (data.audioBase64) {
        setLastAudioBase64(data.audioBase64);
        await audioEngine.playPcmAudio(data.audioBase64, settings.audioFilter);
      } else {
        await audioEngine.speakUrduFallback(aiReplyText, persona.gender, settings.speechRate);
      }
    } catch (error) {
      console.error('Call error:', error);
      setIsProcessing(false);
      setIsAiSpeaking(true);
      const fallbackText = 'معذرت، آواز میں تھوڑا وقفہ آیا۔ کیا آپ دوبارہ فرما سکتے ہیں؟';
      await audioEngine.speakUrduFallback(fallbackText, persona.gender, settings.speechRate);
    } finally {
      setIsAiSpeaking(false);
      isSendingRef.current = false;
    }
  };

  const handleManualTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    const text = textInput;
    setTextInput('');
    setShowTextKeyboard(false);
    sendUserUtterance(text);
  };

  const handleReplayLastAudio = async () => {
    if (lastAudioBase64) {
      setIsAiSpeaking(true);
      await audioEngine.playPcmAudio(lastAudioBase64, settings.audioFilter);
      setIsAiSpeaking(false);
    } else if (currentAiResponse.urduText) {
      setIsAiSpeaking(true);
      await audioEngine.speakUrduFallback(currentAiResponse.urduText, persona.gender, settings.speechRate);
      setIsAiSpeaking(false);
    }
  };

  const handleEndCallClick = () => {
    audioEngine.stopSpeaking();
    speechManager.stopListening();
    audioEngine.playEndCallSound();
    onEndCall(transcripts, duration);
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div
      id="active-call-screen"
      className="fixed inset-0 z-50 flex flex-col justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden select-none"
    >
      {/* Background ambient lighting */}
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* TOP BAR: Call Status, Duration, Person Info */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-800/60 bg-slate-950/40 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-full bg-slate-800 border border-emerald-500/40 flex items-center justify-center text-xl shadow-md">
            {persona.avatarIcon}
            {isAiSpeaking && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-slate-950 animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-urdu leading-none text-white">
                {persona.nameUrdu}
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                Live
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              {formatDuration(duration)} • {settings.audioFilter === 'hd' ? 'HD Voice' : 'Phone Speaker'}
            </p>
          </div>
        </div>

        {/* Top Right Controls (Subtitle toggles, History drawer, Settings) */}
        <div className="flex items-center gap-2">
          <button
            id="toggle-transcript-drawer-btn"
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            title="View Full Call Transcript"
            className={`p-2 rounded-xl border text-xs flex items-center gap-1 transition-all ${
              showFullTranscript
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-urdu">گفتگو</span>
          </button>

          <button
            id="open-settings-in-call-btn"
            onClick={onOpenSettings}
            title="Call Settings"
            className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700 transition-all"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FULL TRANSCRIPT OVERLAY DRAWER (If toggled) */}
      {showFullTranscript ? (
        <div className="relative z-20 flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs text-slate-400">
            <span className="font-urdu font-semibold text-slate-200">مکالمے کی تفصیل (Live Transcript)</span>
            <span>{transcripts.length} Messages</span>
          </div>

          <div className="space-y-3" ref={transcriptScrollRef}>
            {transcripts.map((msg) => (
              <div
                key={msg.id}
                className={`p-3.5 rounded-2xl max-w-[88%] ${
                  msg.sender === 'user'
                    ? 'ml-auto bg-emerald-600/20 border border-emerald-500/30 text-emerald-100 rounded-br-none'
                    : 'mr-auto bg-slate-800/70 border border-slate-700/50 text-slate-200 rounded-bl-none'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    {msg.sender === 'user' ? '👤 آپ (You)' : `🤖 ${persona.nameUrdu}`}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">{msg.timestamp}</span>
                </div>
                <p className="text-base font-urdu leading-relaxed" dir="rtl">
                  {msg.urduText}
                </p>
                {msg.romanUrdu && (
                  <p className="text-xs text-slate-300 mt-1 italic font-sans">{msg.romanUrdu}</p>
                )}
                {msg.englishTranslation && (
                  <p className="text-xs text-slate-400 mt-0.5 font-sans">{msg.englishTranslation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* MAIN LIVE VOICE CALL CENTER VIEW */
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-2 max-w-xl mx-auto w-full text-center">
          {/* Animated Interactive AI Voice Orb */}
          <div className="relative flex items-center justify-center my-2">
            {/* Dynamic Sound Wave Rings */}
            <div
              className={`absolute rounded-full border transition-all duration-300 ${
                isAiSpeaking
                  ? 'border-emerald-400/40 w-56 h-56 sm:w-64 sm:h-64 animate-ping'
                  : isUserSpeaking
                  ? 'border-sky-400/40 w-56 h-56 sm:w-64 sm:h-64 animate-ping'
                  : 'border-slate-700/20 w-44 h-44'
              }`}
              style={{
                transform: `scale(${1 + audioLevel * 0.4})`,
                animationDuration: '1.8s',
              }}
            />

            <div
              className={`absolute rounded-full transition-all duration-200 ${
                isAiSpeaking
                  ? 'w-44 h-44 sm:w-52 sm:h-52 bg-emerald-500/20 blur-md'
                  : isUserSpeaking
                  ? 'w-44 h-44 sm:w-52 sm:h-52 bg-sky-500/20 blur-md'
                  : 'w-36 h-36 bg-slate-800/20'
              }`}
            />

            {/* Central Glow Orb */}
            <div
              className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center border-2 shadow-2xl transition-all duration-300 ${
                isAiSpeaking
                  ? 'bg-gradient-to-tr from-emerald-600 to-teal-500 border-emerald-300 shadow-emerald-500/40 scale-105'
                  : isUserSpeaking
                  ? 'bg-gradient-to-tr from-sky-600 to-blue-500 border-sky-300 shadow-sky-500/40 scale-105'
                  : isProcessing
                  ? 'bg-gradient-to-tr from-amber-600 to-yellow-500 border-amber-300 shadow-amber-500/40 animate-pulse'
                  : 'bg-gradient-to-tr from-slate-800 to-slate-900 border-slate-700 shadow-black/60'
              }`}
            >
              <span className="text-4xl select-none">{persona.avatarIcon}</span>
              <span className="text-[10px] font-bold tracking-wider uppercase mt-1 px-2 py-0.5 rounded-full bg-slate-950/60 text-slate-200">
                {isAiSpeaking ? 'بول رہی ہیں...' : isUserSpeaking ? 'سن رہی ہیں...' : isProcessing ? 'سوچ رہی ہیں...' : 'تیار (Ready)'}
              </span>
            </div>
          </div>

          {/* Equalizer Frequency Bars */}
          <div className="flex items-center justify-center gap-1 h-6 my-2">
            {[40, 70, 90, 60, 100, 75, 45, 85, 65, 30].map((h, i) => {
              const active = isAiSpeaking || isUserSpeaking;
              const barHeight = active ? Math.max(15, (h * audioLevel) % 100) : 15;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-150 ${
                    isAiSpeaking
                      ? 'bg-emerald-400'
                      : isUserSpeaking
                      ? 'bg-sky-400'
                      : 'bg-slate-700'
                  }`}
                  style={{ height: `${barHeight}%` }}
                />
              );
            })}
          </div>

          {/* LIVE CALL CAPTION / SUBTITLE DISPLAY */}
          <div className="w-full max-w-md bg-slate-900/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl backdrop-blur-md my-1 text-right">
            {/* Interim user voice text preview (Live while user is speaking) */}
            {isUserSpeaking && interimUserText && (
              <div className="mb-2 p-2 rounded-xl bg-sky-950/60 border border-sky-800/50 text-right">
                <span className="text-[10px] text-sky-400 font-bold block">آپ بول رہے ہیں (Listening...):</span>
                <p className="text-sm font-urdu text-sky-200" dir="rtl">
                  "{interimUserText}"
                </p>
              </div>
            )}

            {/* AI Speech Subtitle */}
            <div className="flex items-center justify-between text-left mb-1.5">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <Radio className="w-3 h-3 animate-pulse text-emerald-400" />
                {persona.nameUrdu}
              </span>

              {/* Subtitle language switcher */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  onClick={() => setSelectedSubtitles(s => ({ ...s, urdu: !s.urdu }))}
                  className={`px-1.5 py-0.5 rounded border transition-all ${
                    selectedSubtitles.urdu
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  اردو
                </button>
                <button
                  onClick={() => setSelectedSubtitles(s => ({ ...s, roman: !s.roman }))}
                  className={`px-1.5 py-0.5 rounded border transition-all ${
                    selectedSubtitles.roman
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Roman
                </button>
                <button
                  onClick={() => setSelectedSubtitles(s => ({ ...s, english: !s.english }))}
                  className={`px-1.5 py-0.5 rounded border transition-all ${
                    selectedSubtitles.english
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800 border-slate-700 text-slate-400'
                  }`}
                >
                  Eng
                </button>
              </div>
            </div>

            {/* Urdu Text Script */}
            {selectedSubtitles.urdu && (
              <p
                className={`font-urdu font-medium text-slate-100 leading-relaxed text-right transition-all ${
                  settings.fontSize === 'large'
                    ? 'text-xl'
                    : settings.fontSize === 'small'
                    ? 'text-sm'
                    : 'text-base'
                }`}
                dir="rtl"
              >
                {currentAiResponse.urduText}
              </p>
            )}

            {/* Roman Urdu */}
            {selectedSubtitles.roman && currentAiResponse.romanUrdu && (
              <p className="text-xs text-slate-300 mt-1 italic text-left font-sans">
                "{currentAiResponse.romanUrdu}"
              </p>
            )}

            {/* English translation */}
            {selectedSubtitles.english && currentAiResponse.englishTranslation && (
              <p className="text-xs text-slate-400 mt-0.5 text-left font-sans">
                {currentAiResponse.englishTranslation}
              </p>
            )}

            {/* Replay speech button */}
            <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-800/80">
              <button
                id="replay-ai-audio-btn"
                onClick={handleReplayLastAudio}
                disabled={isAiSpeaking}
                className="text-[11px] flex items-center gap-1 text-slate-400 hover:text-emerald-300 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3 h-3" />
                <span>دوبارہ سنیں (Replay Audio)</span>
              </button>
            </div>
          </div>

          {/* Quick Urdu Prompt Chips / Smart Suggested Replies */}
          <div className="w-full max-w-md mt-2">
            <p className="text-[11px] font-medium text-slate-400 text-right mb-1.5 flex items-center justify-end gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>فوری بولنے کے لیے ٹیپ کریں (Tap to Speak):</span>
            </p>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar justify-end flex-wrap">
              {suggestedReplies.slice(0, 3).map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => sendUserUtterance(item.urdu)}
                  disabled={isProcessing || isAiSpeaking}
                  className="px-2.5 py-1 rounded-xl bg-slate-800/90 hover:bg-emerald-950/60 border border-slate-700/80 hover:border-emerald-500/50 text-xs font-urdu text-slate-200 hover:text-emerald-200 transition-all active:scale-95 disabled:opacity-40 whitespace-nowrap cursor-pointer"
                  dir="rtl"
                >
                  {item.urdu}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TEXT INPUT FALLBACK DRAWER (If user prefers typing) */}
      {showTextKeyboard && (
        <form
          onSubmit={handleManualTextSubmit}
          className="relative z-20 px-4 py-2 bg-slate-900 border-t border-slate-800 flex items-center gap-2 max-w-xl mx-auto w-full"
        >
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="یہاں اردو یا انگلش میں لکھیں (Type in Urdu or English)..."
            className="flex-1 px-4 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500 font-urdu"
            dir="auto"
          />
          <button
            type="submit"
            disabled={!textInput.trim()}
            className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-40 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* BOTTOM ACTION TOOLBAR (Mute, Mic Handsfree / Push to Talk, Keyboard, Keypad, End Call) */}
      <div className="relative z-10 w-full max-w-md mx-auto px-6 pb-6 pt-2">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-3.5 shadow-2xl backdrop-blur-md flex items-center justify-around gap-2">
          {/* Mute Button */}
          <button
            id="toggle-mute-btn"
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? 'Unmute' : 'Mute'}
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              isMuted
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            <span className="text-[9px] font-urdu mt-0.5">{isMuted ? 'خاموش' : 'مائیک'}</span>
          </button>

          {/* Center Main Push-to-Talk / Continuous Voice Button */}
          <button
            id="main-voice-talk-btn"
            onClick={() => {
              if (isAiSpeaking) {
                audioEngine.stopSpeaking();
                setIsAiSpeaking(false);
              }
              // If not hands-free, start a quick speech query
              startListeningUser();
            }}
            title="Speak into Microphone in Urdu"
            className={`w-16 h-16 rounded-full flex flex-col items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${
              isUserSpeaking
                ? 'bg-sky-500 text-white shadow-sky-500/50 scale-105 ring-4 ring-sky-400/30 animate-pulse'
                : isAiSpeaking
                ? 'bg-emerald-600 text-white shadow-emerald-600/40'
                : 'bg-gradient-to-tr from-emerald-500 to-teal-500 text-white hover:brightness-110 shadow-emerald-500/30'
            }`}
          >
            <Mic className="w-7 h-7" />
            <span className="text-[9px] font-urdu font-bold">
              {isUserSpeaking ? 'سن رہے ہیں' : 'بولیں'}
            </span>
          </button>

          {/* Keypad dialer */}
          <button
            id="open-keypad-btn"
            onClick={onOpenKeypad}
            title="Dialer Keypad"
            className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 flex flex-col items-center justify-center transition-all"
          >
            <Grid className="w-5 h-5" />
            <span className="text-[9px] font-urdu mt-0.5">کی پیڈ</span>
          </button>

          {/* Text typing toggle */}
          <button
            id="toggle-typing-btn"
            onClick={() => setShowTextKeyboard(!showTextKeyboard)}
            title="Type Text in Urdu"
            className={`w-12 h-12 rounded-2xl flex flex-col items-center justify-center transition-all ${
              showTextKeyboard
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[9px] font-urdu mt-0.5">لکھیں</span>
          </button>

          {/* End Call Button */}
          <button
            id="end-call-active-btn"
            onClick={handleEndCallClick}
            title="End Call"
            className="w-13 h-13 rounded-2xl bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex flex-col items-center justify-center shadow-lg shadow-rose-900/50 transition-all border border-rose-400/40 cursor-pointer"
          >
            <PhoneOff className="w-6 h-6" />
            <span className="text-[9px] font-urdu font-bold mt-0.5">ختم</span>
          </button>
        </div>

        {/* Live Call Mode Indicator */}
        <p className="text-[11px] text-slate-500 text-center mt-2 flex items-center justify-center gap-1.5 font-urdu">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>لائیو کال جاری ہے • آپ براہ راست اردو میں بات کر سکتے ہیں</span>
        </p>
      </div>
    </div>
  );
};
