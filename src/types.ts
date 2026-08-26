export type CallStatus = 'idle' | 'incoming_ringing' | 'outgoing_calling' | 'connected' | 'ended';

export type PersonaId = 'ayesha' | 'bilal' | 'ustad' | 'sana' | 'zain';

export interface Persona {
  id: PersonaId;
  nameUrdu: string;
  nameEnglish: string;
  roleUrdu: string;
  roleEnglish: string;
  voiceName: string;
  gender: 'female' | 'male';
  avatarBg: string;
  avatarIcon: string;
  descriptionUrdu: string;
  descriptionEnglish: string;
  defaultGreetingUrdu: string;
  defaultGreetingRoman: string;
  defaultGreetingEnglish: string;
  sampleAudioSnippet?: string;
  specialty: string[];
}

export interface TranscriptMessage {
  id: string;
  sender: 'user' | 'ai';
  urduText: string;
  romanUrdu?: string;
  englishTranslation?: string;
  timestamp: string;
  audioDuration?: number;
  mood?: string;
}

export interface CallLog {
  id: string;
  personaId: PersonaId;
  personaName: string;
  startTime: number;
  durationSeconds: number;
  messagesCount: number;
  transcripts: TranscriptMessage[];
  dateString: string;
}

export interface CallSettings {
  handsFreeMode: boolean; // Continuous voice detection
  speechRate: number; // 0.8 to 1.3
  audioFilter: 'hd' | 'phone_speaker';
  showRomanUrdu: boolean;
  showEnglishTranslation: boolean;
  showUrduScript: boolean;
  fontSize: 'small' | 'medium' | 'large';
  autoRingtone: boolean;
  enableVibration: boolean;
}
