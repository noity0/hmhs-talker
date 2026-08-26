import React, { useState } from 'react';
import { X, Delete } from 'lucide-react';
import { audioEngine } from '../utils/audioPlayer';

interface KeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KEYS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC / ا ب' },
  { digit: '3', letters: 'DEF / پ ت' },
  { digit: '4', letters: 'GHI / ج چ' },
  { digit: '5', letters: 'JKL / د ڈ' },
  { digit: '6', letters: 'MNO / ر ڑ' },
  { digit: '7', letters: 'PQRS / س ش' },
  { digit: '8', letters: 'TUV / ط ظ' },
  { digit: '9', letters: 'WXYZ / ک گ' },
  { digit: '*', letters: '' },
  { digit: '0', letters: '+' },
  { digit: '#', letters: '' },
];

export const KeypadModal: React.FC<KeypadModalProps> = ({ isOpen, onClose }) => {
  const [dialedNumbers, setDialedNumbers] = useState<string>('');

  if (!isOpen) return null;

  const handleKeyPress = (key: string) => {
    audioEngine.playKeypadTone(key);
    setDialedNumbers(prev => prev + key);
  };

  const handleBackspace = () => {
    setDialedNumbers(prev => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>

        <h3 className="text-sm font-semibold font-urdu text-center text-slate-300 mb-2">
          فون ڈائل پیڈ (Phone Keypad)
        </h3>

        {/* Dialed Display */}
        <div className="h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between px-3 mb-4">
          <span className="text-xl font-mono tracking-widest text-emerald-400 overflow-x-auto whitespace-nowrap">
            {dialedNumbers || '...'}
          </span>
          {dialedNumbers && (
            <button
              onClick={handleBackspace}
              className="text-slate-400 hover:text-rose-400 p-1"
            >
              <Delete className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-3 gap-3">
          {KEYS.map((item) => (
            <button
              key={item.digit}
              onClick={() => handleKeyPress(item.digit)}
              className="h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:scale-95 border border-slate-700/60 flex flex-col items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              <span className="text-xl font-bold font-mono leading-none">{item.digit}</span>
              {item.letters && (
                <span className="text-[8px] text-slate-400 uppercase mt-0.5 tracking-tight font-urdu">
                  {item.letters}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
