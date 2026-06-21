"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const LANGUAGES = [
  { code: "th", name: "Thai", flag: "🇹🇭" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "ja", name: "Japanese", flag: "🇯🇵" },
  { code: "ko", name: "Korean", flag: "🇰🇷" },
  { code: "zh", name: "Chinese", flag: "🇨🇳" },
  { code: "es", name: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "French", flag: "🇫🇷" },
  { code: "de", name: "German", flag: "🇩🇪" },
  { code: "vi", name: "Vietnamese", flag: "🇻🇳" },
  { code: "id", name: "Indonesian", flag: "🇮🇩" },
  { code: "ms", name: "Malay", flag: "🇲🇾" },
  { code: "ar", name: "Arabic", flag: "🇸🇦" },
];

interface TranslationEntry {
  id: number;
  original: string;
  translated: string;
  timestamp: Date;
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("th");
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<"source" | "target" | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const translationIdRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sourceLangData = LANGUAGES.find((l) => l.code === sourceLang);
  const targetLangData = LANGUAGES.find((l) => l.code === targetLang);

  const translateText = useCallback(
    async (text: string): Promise<string> => {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
        );
        const data = await res.json();
        return data.responseData?.translatedText || text;
      } catch {
        return `[Translation error] ${text}`;
      }
    },
    [sourceLang, targetLang]
  );

  const processTranscript = useCallback(
    async (transcript: string) => {
      if (!transcript.trim()) return;
      const translated = await translateText(transcript);
      const id = ++translationIdRef.current;
      setTranslations((prev) => [
        ...prev,
        { id, original: transcript, translated, timestamp: new Date() },
      ]);
    },
    [translateText]
  );

  const startListening = useCallback(() => {
    setError(null);
    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      setError("Speech recognition is not supported. Please use Chrome or Safari.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = sourceLang;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += transcript;
        else interim += transcript;
      }
      setInterimText(interim);
      if (final) processTranscript(final);
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(`Recognition error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try { recognition.start(); } catch { setIsListening(false); }
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setError("Failed to start speech recognition");
    }
  }, [sourceLang, isListening, processTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening();
    else startListening();
  }, [isListening, startListening, stopListening]);

  const swapLanguages = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  const clearTranslations = useCallback(() => {
    setTranslations([]);
    setInterimText("");
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [translations]);

  useEffect(() => {
    return () => { recognitionRef.current?.stop(); };
  }, []);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-b from-[#0a0a1a] via-[#0d0d24] to-[#0a0a1a] text-white overflow-hidden">
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-purple-600/8 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-blue-600/8 blur-[120px]" />
        {isListening && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] rounded-full bg-red-500/5 blur-[150px] animate-ambient-glow" />
        )}
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-header">
        <div className="max-w-2xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <span className="text-lg">🌐</span>
            </div>
            <span className="text-lg font-bold tracking-tight">Live Translator</span>
          </div>
          {translations.length > 0 && (
            <button
              onClick={clearTranslations}
              className="px-4 py-1.5 rounded-full text-sm font-medium text-white/40 hover:text-white/70 bg-white/5 hover:bg-white/10 transition-all"
            >
              Clear all
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col pt-16 pb-44 relative z-10">
        {/* Language selector */}
        <div className="max-w-2xl mx-auto w-full px-5 py-4">
          <div className="glass-card rounded-2xl p-3 flex items-center gap-2">
            <button
              onClick={() => setShowLangPicker("source")}
              className="flex-1 rounded-xl px-4 py-3.5 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 transition-all active:scale-[0.97]"
            >
              <span className="text-2xl">{sourceLangData?.flag}</span>
              <span className="text-base font-semibold">{sourceLangData?.name}</span>
            </button>

            <button
              onClick={swapLanguages}
              className="w-11 h-11 flex items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 hover:from-violet-500/30 hover:to-blue-500/30 border border-white/10 transition-all active:scale-90 shrink-0"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </button>

            <button
              onClick={() => setShowLangPicker("target")}
              className="flex-1 rounded-xl px-4 py-3.5 flex items-center justify-center gap-3 bg-white/5 hover:bg-white/10 transition-all active:scale-[0.97]"
            >
              <span className="text-2xl">{targetLangData?.flag}</span>
              <span className="text-base font-semibold">{targetLangData?.name}</span>
            </button>
          </div>
        </div>

        {/* Translation area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-5">
          <div className="max-w-2xl mx-auto space-y-3 pb-4">
            {/* Empty state */}
            {translations.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center py-20 text-white/20">
                <div className="relative mb-8">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-violet-500/10 to-blue-500/10 flex items-center justify-center border border-white/5">
                    <svg className="w-12 h-12 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>
                <p className="text-xl font-semibold text-white/30">Tap microphone to start</p>
                <p className="text-sm mt-2 text-white/15">Speak in {sourceLangData?.name}</p>
              </div>
            )}

            {/* Listening state */}
            {isListening && translations.length === 0 && !interimText && (
              <div className="flex flex-col items-center justify-center py-16 animate-fade-in">
                <div className="relative mb-10">
                  {/* Outer rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-40 h-40 rounded-full border border-red-500/10 animate-listen-ring-1" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-52 h-52 rounded-full border border-red-500/5 animate-listen-ring-2" />
                  </div>

                  {/* Center mic */}
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-2xl shadow-red-500/30 animate-listen-breathe relative z-10">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-2xl font-bold bg-gradient-to-r from-red-400 to-rose-400 bg-clip-text text-transparent">Listening...</p>
                  <p className="text-sm text-white/30 mt-2">Speak in {sourceLangData?.name}</p>
                </div>

                {/* Sound wave */}
                <div className="flex items-center gap-[3px] mt-8 h-8">
                  {[1,2,3,4,5,6,7,8,9].map((i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full bg-gradient-to-t from-red-500 to-rose-400 opacity-60 animate-eq-bar"
                      style={{ animationDelay: `${i * 0.08}s`, animationDuration: `${0.4 + (i % 3) * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Translation entries */}
            {translations.map((entry, idx) => (
              <div
                key={entry.id}
                className="animate-fade-in-up glass-card rounded-2xl p-5 space-y-2 group hover:bg-white/[0.07] transition-colors"
                style={{ animationDelay: `${Math.min(idx * 0.05, 0.3)}s` }}
              >
                <p className="text-white/40 text-sm leading-relaxed">{entry.original}</p>
                <div className="w-8 h-[1px] bg-gradient-to-r from-violet-500/40 to-transparent mb-1" />
                <p className="text-white text-lg font-semibold leading-relaxed">{entry.translated}</p>
              </div>
            ))}

            {/* Interim text */}
            {interimText && (
              <div className="glass-card rounded-2xl p-5 border border-white/5 animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-xs text-white/30 font-medium uppercase tracking-wider">Listening</span>
                </div>
                <p className="text-white/30 text-base italic leading-relaxed">{interimText}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 glass-bottom">
        <div className="max-w-2xl mx-auto flex flex-col items-center pt-6 pb-8">
          {/* Mic button */}
          <button
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-500 active:scale-90 ${
              isListening
                ? "bg-gradient-to-br from-red-500 to-rose-600 shadow-2xl shadow-red-500/40"
                : "bg-white/10 hover:bg-white/15 border border-white/10"
            }`}
          >
            {isListening && (
              <>
                <span className="absolute inset-[-8px] rounded-full bg-red-500/20 animate-pulse-ring" />
                <span className="absolute inset-[-16px] rounded-full bg-red-500/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
                <span className="absolute inset-[-24px] rounded-full bg-red-500/5 animate-pulse-ring" style={{ animationDelay: "1s" }} />
              </>
            )}
            {isListening ? (
              <svg className="relative w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="relative w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          {/* Status text */}
          <div className="mt-4 h-6 flex items-center">
            {isListening ? (
              <p className="text-sm text-white/40 font-medium animate-fade-in">
                Listening in {sourceLangData?.name}
              </p>
            ) : error ? (
              <p className="text-sm text-red-400 font-medium animate-fade-in">{error}</p>
            ) : (
              <p className="text-sm text-white/20">Tap to translate</p>
            )}
          </div>
        </div>
      </div>

      {/* Language picker */}
      {showLangPicker && (
        <div
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end justify-center animate-fade-in"
          onClick={() => setShowLangPicker(null)}
        >
          <div
            className="w-full max-w-2xl glass-card rounded-t-3xl p-6 pb-10 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/15 rounded-full mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-5">
              {showLangPicker === "source" ? "Translate from" : "Translate to"}
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {LANGUAGES.map((lang) => {
                const isSelected =
                  showLangPicker === "source"
                    ? lang.code === sourceLang
                    : lang.code === targetLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (showLangPicker === "source") setSourceLang(lang.code);
                      else setTargetLang(lang.code);
                      setShowLangPicker(null);
                    }}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-all active:scale-95 ${
                      isSelected
                        ? "bg-gradient-to-br from-violet-500/20 to-blue-500/20 ring-1 ring-violet-500/30 shadow-lg shadow-violet-500/10"
                        : "bg-white/5 hover:bg-white/8"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-xs font-medium text-white/70">{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
