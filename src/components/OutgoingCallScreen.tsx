import React, { useEffect } from 'react';
import { PhoneOff, Loader2 } from 'lucide-react';
import { Persona } from '../types';
import { audioEngine } from '../utils/audioPlayer';

interface OutgoingCallScreenProps {
  persona: Persona;
  onConnected: () => void;
  onCancel: () => void;
}

export const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({
  persona,
  onConnected,
  onCancel,
}) => {
  useEffect(() => {
    // Start outgoing ringtone
    audioEngine.startOutgoingRingtone();

    // Auto connect after 2.5s
    const timer = setTimeout(() => {
      audioEngine.stopRingtone();
      audioEngine.playConnectSound();
      onConnected();
    }, 2500);

    return () => {
      clearTimeout(timer);
      audioEngine.stopRingtone();
    };
  }, [onConnected]);

  const handleCancel = () => {
    audioEngine.stopRingtone();
    audioEngine.playEndCallSound();
    onCancel();
  };

  return (
    <div
      id="outgoing-call-screen"
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 text-white overflow-hidden select-none"
    >
      {/* Top section */}
      <div className="relative z-10 flex flex-col items-center pt-10 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs font-medium text-sky-400 mb-4 backdrop-blur-md">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>کال ملائی جا رہی ہے...</span>
          <span className="text-slate-400">• Calling...</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold font-urdu tracking-wide text-white drop-shadow-md">
          {persona.nameUrdu}
        </h1>
        <p className="text-sm font-medium text-slate-300 mt-1">
          {persona.nameEnglish} • {persona.roleUrdu}
        </p>
        <p className="text-xs text-sky-400 font-mono mt-2 tracking-widest uppercase">
          Ringing...
        </p>
      </div>

      {/* Center avatar with pulsing rings */}
      <div className="relative z-10 flex flex-col items-center justify-center my-auto">
        <div className="relative flex items-center justify-center">
          <div className="absolute w-56 h-56 rounded-full border border-sky-500/30 animate-ping opacity-50" style={{ animationDuration: '2s' }} />
          <div className="absolute w-44 h-44 rounded-full border border-indigo-500/30 animate-pulse" />
          <div className="w-32 h-32 rounded-full bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-sky-400/50 shadow-2xl flex flex-col items-center justify-center">
            <span className="text-5xl">{persona.avatarIcon}</span>
          </div>
        </div>

        <p className="mt-8 text-xs text-slate-400 font-urdu max-w-xs text-center leading-relaxed">
          براہ راست آواز کی گفتگو شروع ہونے لگی ہے۔ مائیکروفون تیار رکھیں۔
        </p>
      </div>

      {/* Bottom end call button */}
      <div className="relative z-10 w-full max-w-xs pb-10 flex flex-col items-center">
        <button
          id="cancel-outgoing-call-btn"
          onClick={handleCancel}
          className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-rose-900/50 transition-all border border-rose-400/40 cursor-pointer"
        >
          <PhoneOff className="w-7 h-7" />
        </button>
        <span className="text-xs font-urdu font-medium text-rose-300 mt-2">منسوخ کریں (Cancel)</span>
      </div>
    </div>
  );
};
