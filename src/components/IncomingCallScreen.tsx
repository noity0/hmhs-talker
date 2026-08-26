import React, { useEffect } from 'react';
import { Phone, PhoneOff, Volume2, ShieldCheck, Sparkles, MessageCircle } from 'lucide-react';
import { Persona } from '../types';
import { audioEngine } from '../utils/audioPlayer';

interface IncomingCallScreenProps {
  persona: Persona;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  persona,
  onAccept,
  onDecline,
}) => {
  useEffect(() => {
    // Start realistic phone ringing sound on mount
    audioEngine.startIncomingRingtone();

    return () => {
      audioEngine.stopRingtone();
    };
  }, []);

  const handleAccept = () => {
    audioEngine.stopRingtone();
    audioEngine.playConnectSound();
    onAccept();
  };

  const handleDecline = () => {
    audioEngine.stopRingtone();
    audioEngine.playEndCallSound();
    onDecline();
  };

  return (
    <div
      id="incoming-call-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white overflow-hidden select-none"
    >
      {/* Ambient background glow */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />

      {/* Top Header Information */}
      <div className="relative z-10 flex flex-col items-center pt-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-emerald-400 mb-4 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>براہ راست وائس کال موصول ہو رہی ہے</span>
          <span className="text-slate-400">• Live Incoming Call</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-urdu tracking-wide text-white drop-shadow-md">
          {persona.nameUrdu}
        </h1>
        <p className="text-sm font-medium text-slate-300 mt-1">
          {persona.nameEnglish} • {persona.roleUrdu}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          AI Voice Calling in Urdu • HD Voice Ready
        </p>
      </div>

      {/* Center Avatar & Animated Rings */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        {/* Pulsing Ripple Rings */}
        <div className="relative flex items-center justify-center">
          <div className="absolute w-64 h-64 sm:w-72 sm:h-72 rounded-full border border-emerald-500/30 animate-ping opacity-60" style={{ animationDuration: '2.5s' }} />
          <div className="absolute w-52 h-52 sm:w-60 sm:h-60 rounded-full border border-rose-500/30 animate-pulse" />
          <div className="absolute w-44 h-44 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 backdrop-blur-sm animate-pulse-ring" />

          {/* Caller Avatar Card */}
          <div className="relative w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-emerald-400/60 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            <span className="text-5xl select-none mb-1 transform transition-transform group-hover:scale-110">
              {persona.avatarIcon}
            </span>
            <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60">
              {persona.gender === 'female' ? 'Female Voice' : 'Male Voice'}
            </span>
          </div>
        </div>

        {/* Live Audio Greeting preview snippet */}
        <div className="mt-8 max-w-sm px-4 py-3 rounded-2xl bg-slate-900/90 border border-slate-800 text-center backdrop-blur-md shadow-lg">
          <p className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1.5 mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>کال کا تعارفی پیغام (Incoming Message):</span>
          </p>
          <p className="text-sm font-urdu leading-relaxed text-slate-200" dir="rtl">
            "{persona.defaultGreetingUrdu}"
          </p>
          <p className="text-[11px] text-slate-400 mt-1 italic">
            "{persona.defaultGreetingRoman}"
          </p>
        </div>
      </div>

      {/* Bottom Action Controls (Decline & Answer Buttons) */}
      <div className="relative z-10 w-full max-w-md pb-8">
        <div className="flex items-center justify-around gap-6">
          {/* Decline Call Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="decline-incoming-call-btn"
              onClick={handleDecline}
              aria-label="Decline Call"
              className="w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 transition-all border border-rose-400/40 cursor-pointer"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-urdu font-medium text-rose-300">رد کریں (Decline)</span>
          </div>

          {/* Accept Call Button */}
          <div className="flex flex-col items-center gap-2">
            <button
              id="accept-incoming-call-btn"
              onClick={handleAccept}
              aria-label="Accept Call"
              className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-600/50 transition-all border-2 border-emerald-200 animate-bounce cursor-pointer"
              style={{ animationDuration: '1.2s' }}
            >
              <Phone className="w-8 h-8" />
            </button>
            <span className="text-xs font-urdu font-bold text-emerald-300">جواب دیں (Answer)</span>
          </div>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-6 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Real-time voice processing via Gemini API • AI Live Call</span>
        </div>
      </div>
    </div>
  );
};
