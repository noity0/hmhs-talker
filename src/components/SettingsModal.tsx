import React from 'react';
import { X, Volume2, Mic, Languages, Sparkles, Sliders } from 'lucide-react';
import { CallSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  settings: CallSettings;
  onUpdateSettings: (newSettings: Partial<CallSettings>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold font-urdu text-slate-100">
              کال کی ترتیبات (Call Settings)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-5 pt-4">
          {/* Hands-free mode toggle */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div>
              <p className="text-sm font-semibold font-urdu text-slate-200">
                ہینڈز فری لائیو گفتگو (Hands-free Voice)
              </p>
              <p className="text-xs text-slate-400">
                جیسے ہی آپ بولنا بند کریں گے، اے آئی خود بخود جواب دے گی
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.handsFreeMode}
              onChange={(e) => onUpdateSettings({ handsFreeMode: e.target.checked })}
              className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
            />
          </div>

          {/* Audio Output Filter */}
          <div>
            <label className="text-xs font-semibold font-urdu text-slate-300 block mb-2">
              صوتی انداز (Audio Profile):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onUpdateSettings({ audioFilter: 'hd' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.audioFilter === 'hd'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-sm font-bold block">✨ HD Studio Audio</span>
                <span className="text-[11px] text-slate-400 font-urdu">صاف اور کرسٹل آواز</span>
              </button>

              <button
                onClick={() => onUpdateSettings({ audioFilter: 'phone_speaker' })}
                className={`p-3 rounded-xl border text-left transition-all ${
                  settings.audioFilter === 'phone_speaker'
                    ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="text-sm font-bold block">📞 Phone Receiver</span>
                <span className="text-[11px] text-slate-400 font-urdu">حقیقی ٹیلی فون اسپیکر فلٹر</span>
              </button>
            </div>
          </div>

          {/* Subtitles Display Toggles */}
          <div>
            <label className="text-xs font-semibold font-urdu text-slate-300 block mb-2">
              سب ٹائٹلز و ترجمہ (Live Captions & Subtitles):
            </label>
            <div className="space-y-2">
              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <span className="text-xs font-urdu text-slate-200">اردو رسم الخط (Urdu Nastaliq Script)</span>
                <input
                  type="checkbox"
                  checked={settings.showUrduScript}
                  onChange={(e) => onUpdateSettings({ showUrduScript: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <span className="text-xs text-slate-200">Roman Urdu Transliteration</span>
                <input
                  type="checkbox"
                  checked={settings.showRomanUrdu}
                  onChange={(e) => onUpdateSettings({ showRomanUrdu: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/50 border border-slate-800 cursor-pointer">
                <span className="text-xs text-slate-200">English Translation Subtitle</span>
                <input
                  type="checkbox"
                  checked={settings.showEnglishTranslation}
                  onChange={(e) => onUpdateSettings({ showEnglishTranslation: e.target.checked })}
                  className="w-4 h-4 accent-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Speech Rate Slider */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold font-urdu text-slate-300">
                بولنے کی رفتار (Speech Speed):
              </label>
              <span className="text-xs font-mono text-emerald-400">{settings.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.25"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-emerald-500"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-urdu">
              <span>آہستہ</span>
              <span>معمول (Normal)</span>
              <span>تیز</span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors font-urdu"
          >
            محفوظ کریں (Save & Close)
          </button>
        </div>
      </div>
    </div>
  );
};
