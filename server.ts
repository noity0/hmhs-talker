import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Modality } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser
app.use(express.json({ limit: '30mb' }));
app.use(express.urlencoded({ extended: true, limit: '30mb' }));

// Lazy Gemini client getter
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: apiKey || '',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Persona configurations
const PERSONAS: Record<string, {
  nameUrdu: string;
  nameEnglish: string;
  voiceName: string;
  gender: 'female' | 'male';
  systemInstruction: string;
  defaultGreetingUrdu: string;
  defaultGreetingRoman: string;
  defaultGreetingEnglish: string;
}> = {
  ayesha: {
    nameUrdu: 'عائشہ (Ayesha)',
    nameEnglish: 'Ayesha - Warm & Cheerful Friend',
    voiceName: 'Kore',
    gender: 'female',
    systemInstruction: `آپ کا نام "عائشہ" (Ayesha) ہے۔ آپ پاکستان سے تعلق رکھنے والی ایک بے حد شائستہ، گرمجوش، ملنسار اور زندہ دل اے آئی دوست ہیں جو فون کال پر بات کر رہی ہیں۔
ہدایات:
1. آپ کو فون کال پر زندہ انسان کی طرح قدرتی اردو میں بات کرنی ہے (Casual, polite spoken Urdu - جیسے فون پر بات کی جاتی ہے)۔
2. جملے بہت طویل مت بنائیں، چھوٹے اور پُراثر جملے بولیں تاکہ لائیو فون کال کا قدرتی احساس برقرار رہے۔
3. گفتگو میں پیار اور اپنائیت کا لہجہ ہو (جیسے: "السلام علیکم!", "جی فرمائیے", "کیا حال چال ہیں آپ کے؟", "ارے واہ!", "بالکل صحیح کہا آپ نے!")۔
4. اگر صارف اردو، رومن اردو یا انگریزی میں بات کرے تو جواب ہمیشہ خوبصورت اور شستہ اردو میں دیں، ساتھ ہی رومن اردو اور انگلش ترجمہ بھی فراہم کریں۔
5. ہمیشہ ایک دوستانہ سوال پوچھ کر بات چیت کو آگے بڑھائیں۔`,
    defaultGreetingUrdu: 'السلام علیکم! میں عائشہ بول رہی ہوں۔ کیسی ہیں آپ؟ امید ہے سب خیریت ہوگی۔ بتائیے آج کیا چل رہا ہے؟',
    defaultGreetingRoman: 'Assalam-o-Alaikum! Main Ayesha bol rahi hoon. Kaise hain aap? Umeed hai sab khairiyat hogi. Batayiye aaj kya chal raha hai?',
    defaultGreetingEnglish: 'Hello and peace be upon you! This is Ayesha calling. How are you doing? I hope all is well. Tell me, what\'s going on today?',
  },
  bilal: {
    nameUrdu: 'بلال (Bilal)',
    nameEnglish: 'Bilal - Smart & Friendly Advisor',
    voiceName: 'Fenrir',
    gender: 'male',
    systemInstruction: `آپ کا نام "بلال" (Bilal) ہے۔ آپ ایک پُراعتماد، ذہین اور مہذب اردو بولنے والے دوست اور مشیر ہیں۔
ہدایات:
1. آپ فون پر کال کے ذریعے صارف سے مخاطب ہیں۔
2. گفتگو میں متانت، سنجیدگی اور دوستانہ خلوص ہو۔
3. لائیو وائس کال کے لیے جملے جامع اور بولنے میں آسان رکھیں۔
4. ہر موضوع پر مدلل اور دلچسپ بات چیت کریں۔`,
    defaultGreetingUrdu: 'السلام علیکم جناب! بلال حاضر ہے۔ کیسے مزاج ہیں آپ کے؟ کیا مصروفیت چل رہی ہے آج کل؟',
    defaultGreetingRoman: 'Assalam-o-Alaikum janab! Bilal hazir hai. Kaise mizaaj hain aap ke? Kya masroofiyat chal rahi hai aaj kal?',
    defaultGreetingEnglish: 'Peace be upon you sir! Bilal here. How is your mood and health? What has been keeping you busy lately?',
  },
  ustad: {
    nameUrdu: 'استاد صاحب (Ustad Sahib)',
    nameEnglish: 'Ustad Alvi - Urdu Literature & Teacher',
    voiceName: 'Charon',
    gender: 'male',
    systemInstruction: `آپ کا نام "استاد علوی" ہے۔ آپ اردو زبان و ادب، شاعری اور حکمت کے شیدائی اور محترم استاد ہیں۔
ہدایات:
1. آپ کا لہجہ بے حد باوقار، ادبی، مہذب اور پیار بھرا ہو۔
2. اردو کے خوبصورت الفاظ، محاورے اور موقع کی مناسبت سے خوبصورت شعر کا استعمال کریں۔
3. شستہ زبان بولیں مگر تکلف سے پاک رکھیں۔`,
    defaultGreetingUrdu: 'وعلیکم السلام و رحمتہ اللہ! استاد علوی کی طرف سے آداب و تسلیمات۔ فرمائیے برخوردار، آج کن ادبی یا علمی باتوں کا ارادہ ہے؟',
    defaultGreetingRoman: 'Wa Alaikum Assalam! Ustad Alvi ki taraf se adaab o tasleemat. Farmayiye barkhurdar, aaj kin adabi ya ilmi baaton ka irada hai?',
    defaultGreetingEnglish: 'Greetings and respect from Ustad Alvi. Tell me dear friend, what literary or thoughtful topics shall we discuss today?',
  },
  sana: {
    nameUrdu: 'ڈاکٹر ثناء (Dr. Sana)',
    nameEnglish: 'Dr. Sana - Health & Wellness Guide',
    voiceName: 'Zephyr',
    gender: 'female',
    systemInstruction: `آپ کا نام "ڈاکٹر ثناء" ہے۔ آپ اردو میں بات کرنے والی ایک مشفق اور ہمدرد ہیلتھ اینڈ ویلنیس کونسلر ہیں۔
ہدایات:
1. دھیمے اور پُرسکون لہجے میں بات کریں۔
2. ذہنی و جسمانی سکون، روزمرہ عادات اور صحت مند زندگی کے بارے میں دوستانہ رہنمائی دیں۔
3. لائیو کال پر مریض/دوست کا حال احوال دریافت کریں۔`,
    defaultGreetingUrdu: 'السلام علیکم! میں ڈاکٹر ثناء ہوں۔ امید ہے آپ کی طبیعت بالکل ٹھیک ہوگی۔ آج کیسا محسوس کر رہے ہیں آپ؟',
    defaultGreetingRoman: 'Assalam-o-Alaikum! Main Dr. Sana hoon. Umeed hai aap ki tabiyat bilkul theek hogi. Aaj kaisa mehsoos kar rahe hain aap?',
    defaultGreetingEnglish: 'Assalam-o-Alaikum! I am Dr. Sana. I hope you are feeling well. How are you feeling today?',
  },
  zain: {
    nameUrdu: 'آر جے زین (RJ Zain)',
    nameEnglish: 'RJ Zain - High Energy Radio Host',
    voiceName: 'Puck',
    gender: 'male',
    systemInstruction: `آپ کا نام "آر جے زین" ہے۔ آپ پاکستان کے ایک سپر انرجیٹک ریڈیو جاکی (RJ) ہیں جو لائیو کال پر سامعین سے گپ شپ کرتے ہیں۔
ہدایات:
1. انداز بے حد پرجوش، دلچسپ، چلبلا اور ہنس مکھ ہو۔
2. جیسے لائیو ایف ایم شو پر کالر سے بات ہو رہی ہو!`,
    defaultGreetingUrdu: 'ہیللو، ہیللو، ہیللو! کیا بات ہے! آر جے زین کے ساتھ لائیو وائس کال پر خوش آمدید! بتائیے، کیسا گزرا آج کا دن؟',
    defaultGreetingRoman: 'Hello, Hello, Hello! Kya baat hai! RJ Zain ke sath live voice call par khush aamdeed! Batayiye, kaisa guzra aaj ka din?',
    defaultGreetingEnglish: 'Hello, hello! Welcome to the live voice call with RJ Zain! Tell me, how was your day?',
  },
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get Personas list
app.get('/api/personas', (req, res) => {
  res.json({ personas: PERSONAS });
});

// Incoming Call Init endpoint (Simulates AI calling the user)
app.post('/api/gemini/init-call', async (req, res) => {
  try {
    const { personaId = 'ayesha' } = req.body;
    const persona = PERSONAS[personaId] || PERSONAS.ayesha;

    let audioBase64: string | null = null;
    try {
      const ai = getGeminiClient();
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: persona.defaultGreetingUrdu }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: persona.voiceName },
            },
          },
        },
      });

      audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr) {
      console.warn('TTS preview model fallback:', ttsErr);
    }

    res.json({
      personaId,
      personaNameUrdu: persona.nameUrdu,
      personaNameEnglish: persona.nameEnglish,
      greetingUrdu: persona.defaultGreetingUrdu,
      greetingRoman: persona.defaultGreetingRoman,
      greetingEnglish: persona.defaultGreetingEnglish,
      audioBase64,
    });
  } catch (error: any) {
    console.error('Error in init-call:', error);
    res.status(500).json({ error: error.message || 'Failed to initialize call' });
  }
});

// Chat Voice Response Endpoint
app.post('/api/gemini/chat-voice', async (req, res) => {
  try {
    const {
      userInput,
      history = [],
      personaId = 'ayesha',
      callTopic = 'general',
      audioInputBase64,
      audioInputMimeType = 'audio/webm',
    } = req.body;

    const ai = getGeminiClient();
    const persona = PERSONAS[personaId] || PERSONAS.ayesha;

    let recognizedText = userInput || '';

    // If direct audio chunk was provided, transcribe with Gemini multimodal
    if (audioInputBase64 && (!userInput || userInput.trim() === '')) {
      try {
        const transcribePrompt = 'Transcribe this spoken audio exactly in Urdu script (and if mixed, accurately transcribe the Urdu/English words). Output ONLY the transcript without comments.';
        const transcribeResult = await ai.models.generateContent({
          model: 'gemini-3.7-flash',
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: audioInputMimeType,
                  data: audioInputBase64,
                },
              },
              { text: transcribePrompt },
            ],
          },
        });
        recognizedText = transcribeResult.text?.trim() || '';
      } catch (sttErr) {
        console.warn('Multimodal audio transcription fallback:', sttErr);
      }
    }

    // Build chat conversation context
    const systemPrompt = `${persona.systemInstruction}

اہم ہدایت: آپ کا مقصد صارف کے ساتھ لائیو وائس کال پر حقیقی اور لائیو گفتگو کرنا ہے۔
صارف نے ابھی کال پر یہ کہا ہے: "${recognizedText || '(صارف نے کال کا آغاز کیا)'}".

آپ کو درج ذیل JSON فارمیٹ میں بالکل درست جواب دینا ہے (کوئی مارک ڈاؤن کوڈ بلاک کے بغیر یا صاف JSON):
{
  "urduText": "اردو زبان میں آپ کا قدرتی، مختصر اور پرکشش بولا جانے والا جواب (1 سے 3 جملے)",
  "romanUrdu": "اسی جواب کا رومن اردو (Roman Urdu) میں تلفظ",
  "englishTranslation": "اسی بات کا انگریزی ترجمہ",
  "mood": "friendly | happy | thoughtful | caring | energetic",
  "suggestedRepliesUrdu": ["اگلا متوقع جملہ 1", "اگلا متوقع جملہ 2", "اگلا متوقع جملہ 3"],
  "suggestedRepliesRoman": ["Next possible reply in Roman Urdu 1", "Next possible reply in Roman Urdu 2", "Next possible reply in Roman Urdu 3"]
}`;

    // Format previous messages
    const formattedContents: any[] = [];
    
    // Add history
    if (Array.isArray(history)) {
      for (const item of history.slice(-8)) {
        if (item.role === 'user') {
          formattedContents.push({
            role: 'user',
            parts: [{ text: item.text }],
          });
        } else if (item.role === 'model' || item.role === 'assistant') {
          formattedContents.push({
            role: 'model',
            parts: [{ text: item.urduText || item.text }],
          });
        }
      }
    }

    formattedContents.push({
      role: 'user',
      parts: [{ text: systemPrompt }],
    });

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: formattedContents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.8,
      },
    });

    const rawResponseText = aiResponse.text || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawResponseText);
    } catch {
      const match = rawResponseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        parsed = {
          urduText: 'جی بالکل! میں آپ کی بات سمجھ رہی ہوں۔ آگے فرمائیے۔',
          romanUrdu: 'Ji bilkul! Main aap ki baat samajh rahi hoon. Aage farmayiye.',
          englishTranslation: 'Yes absolutely! I understand your point. Please continue.',
          suggestedRepliesUrdu: ['مزید بتائیں', 'آپ کا شکریہ', 'ایک اور سوال ہے'],
          suggestedRepliesRoman: ['Mazeed batayein', 'Aap ka shukriya', 'Ek aur sawal hai'],
        };
      }
    }

    const urduSpeechText = parsed.urduText || 'جی میں سن رہی ہوں۔';

    // Generate Audio with Gemini TTS
    let audioBase64: string | null = null;
    try {
      const ttsResponse = await ai.models.generateContent({
        model: 'gemini-3.1-flash-tts-preview',
        contents: [{ parts: [{ text: urduSpeechText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: persona.voiceName },
            },
          },
        },
      });

      audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
    } catch (ttsErr) {
      console.warn('TTS generation notice:', ttsErr);
    }

    res.json({
      recognizedInput: recognizedText,
      urduText: parsed.urduText,
      romanUrdu: parsed.romanUrdu,
      englishTranslation: parsed.englishTranslation,
      mood: parsed.mood || 'friendly',
      suggestedRepliesUrdu: parsed.suggestedRepliesUrdu || [],
      suggestedRepliesRoman: parsed.suggestedRepliesRoman || [],
      audioBase64,
      personaId,
    });
  } catch (error: any) {
    console.error('Error in chat-voice:', error);
    res.status(500).json({
      error: error.message || 'Server error occurred during Urdu voice call processing',
      urduText: 'معذرت، آواز میں تھوڑا مسئلہ ہوا۔ کیا آپ دوبارہ فرما سکتے ہیں؟',
      romanUrdu: 'Maazrat, aawaz mein thora masla hua. Kya aap dobara farma sakte hain?',
      englishTranslation: 'Sorry, there was a slight audio issue. Could you please repeat?',
    });
  }
});

// Dedicated TTS Endpoint
app.post('/api/gemini/tts', async (req, res) => {
  try {
    const { text, voiceName = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-tts-preview',
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(502).json({ error: 'No audio returned from model' });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: 'audio/pcm',
      sampleRate: 24000,
    });
  } catch (error: any) {
    console.error('Error generating TTS:', error);
    res.status(500).json({ error: error.message || 'TTS generation failed' });
  }
});

// Setup Vite development or production static files
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Urdu Live Voice AI server listening on http://0.0.0.0:${PORT}`);
  });
}

initServer().catch((err) => {
  console.error('Fatal server boot error:', err);
});
