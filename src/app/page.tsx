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

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <rect x="6" y="6" width="12" height="12" rx="3" />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M2 12h1M5 12v-2M8 12v-4M11 12v-1M14 12v-3M17 12v-2M20 12v-1M22 12h1" />
    </svg>
  );
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
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      setError("Speech recognition not supported. Use Chrome or Safari.");
      return;
    }
    const r = new API();
    r.continuous = true;
    r.interimResults = true;
    r.lang = sourceLang;
    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setInterimText(interim);
      if (final) processTranscript(final);
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech") { setError(`Error: ${e.error}`); setIsListening(false); }
    };
    r.onend = () => { if (isListening) try { r.start(); } catch { setIsListening(false); } };
    recognitionRef.current = r;
    try { r.start(); setIsListening(true); } catch { setError("Failed to start"); }
  }, [sourceLang, isListening, processTranscript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) stopListening(); else startListening();
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
    <div className="min-h-[100dvh] flex flex-col bg-[#09090b] text-white overflow-hidden relative">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full bg-violet-600/[0.04] blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full bg-indigo-600/[0.04] blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-rose-600/[0.03] blur-[120px] transition-opacity duration-1000" style={{ opacity: isListening ? 1 : 0 }} />
      </div>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b border-white/[0.04]" style={{ background: "rgba(9,9,11,0.8)", backdropFilter: "blur(24px) saturate(180%)", WebkitBackdropFilter: "blur(24px) saturate(180%)" }}>
        <div className="max-w-xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <WaveIcon className="w-4 h-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Live Translator</span>
          </div>
          {translations.length > 0 && (
            <button onClick={clearTranslations} className="text-[13px] text-white/30 hover:text-white/60 transition-colors px-3 py-1 rounded-full hover:bg-white/5">
              Clear
            </button>
          )}
        </div>
      </header>

      {/* Language bar */}
      <div className="fixed top-14 inset-x-0 z-40" style={{ background: "rgba(9,9,11,0.6)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div className="max-w-xl mx-auto px-5 py-3 flex items-center gap-2">
          <button onClick={() => setShowLangPicker("source")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.04] transition-all active:scale-[0.98]">
            <span className="text-xl">{sourceLangData?.flag}</span>
            <span className="text-sm font-medium text-white/80">{sourceLangData?.name}</span>
          </button>
          <button onClick={swapLanguages} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.04] transition-all active:scale-90">
            <SwapIcon className="w-4 h-4 text-white/50" />
          </button>
          <button onClick={() => setShowLangPicker("target")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.04] transition-all active:scale-[0.98]">
            <span className="text-xl">{targetLangData?.flag}</span>
            <span className="text-sm font-medium text-white/80">{targetLangData?.name}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 flex flex-col pt-[120px] pb-36 relative z-10">
        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-hide px-5">
          <div className="max-w-xl mx-auto space-y-3">

            {/* Empty state */}
            {translations.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center py-24 select-none">
                <div className="relative mb-6">
                  <div className="w-24 h-24 rounded-[28px] bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
                    <MicIcon className="w-10 h-10 text-white/15" />
                  </div>
                </div>
                <p className="text-base font-medium text-white/25">Tap the button to translate</p>
                <p className="text-[13px] text-white/12 mt-1.5">Speak in {sourceLangData?.name}</p>
              </div>
            )}

            {/* Listening state */}
            {isListening && translations.length === 0 && !interimText && (
              <div className="flex flex-col items-center justify-center py-20 animate-fade-in select-none">
                <div className="relative mb-12">
                  {/* Animated rings */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-36 h-36 rounded-full border border-white/[0.04] animate-ring-expand" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-44 h-44 rounded-full border border-white/[0.03] animate-ring-expand" style={{ animationDelay: "0.8s" }} />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-52 h-52 rounded-full border border-white/[0.02] animate-ring-expand" style={{ animationDelay: "1.6s" }} />
                  </div>

                  {/* Center mic */}
                  <div className="relative w-24 h-24 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-[24px] bg-gradient-to-br from-rose-500 to-red-600 shadow-2xl shadow-red-500/25 animate-mic-glow" />
                    <MicIcon className="relative w-10 h-10 text-white drop-shadow-lg" />
                  </div>
                </div>

                <p className="text-lg font-semibold text-white/60 tracking-tight">Listening</p>
                <p className="text-[13px] text-white/20 mt-1">Speak in {sourceLangData?.name}</p>

                {/* Sound wave */}
                <div className="flex items-center gap-[2px] mt-8 h-6">
                  {[0,1,2,3,4,5,6,7,8,9,10].map((i) => (
                    <div key={i} className="w-[2px] rounded-full bg-white/20 animate-eq" style={{ animationDelay: `${i * 0.07}s`, animationDuration: `${0.35 + (i % 4) * 0.12}s` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Interim */}
            {interimText && (
              <div className="rounded-2xl p-5 bg-white/[0.03] border border-white/[0.05] animate-fade-in">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-[11px] text-white/25 font-medium uppercase tracking-widest">Listening</span>
                </div>
                <p className="text-[15px] text-white/25 italic leading-relaxed">{interimText}</p>
              </div>
            )}

            {/* Translations */}
            {translations.map((entry, idx) => (
              <div
                key={entry.id}
                className="rounded-2xl bg-white/[0.03] border border-white/[0.04] overflow-hidden animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.2)}s` }}
              >
                <div className="px-5 pt-4 pb-3">
                  <p className="text-[13px] text-white/30 leading-relaxed">{entry.original}</p>
                </div>
                <div className="h-[1px] bg-white/[0.04] mx-5" />
                <div className="px-5 pt-3 pb-4">
                  <p className="text-[16px] font-semibold text-white/90 leading-relaxed">{entry.translated}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Bottom mic area */}
      <div className="fixed bottom-0 inset-x-0 z-50 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/80 to-transparent" />
        <div className="relative max-w-xl mx-auto flex flex-col items-center pt-12 pb-8 pointer-events-auto">
          <button onClick={toggleListening} className="group relative">
            {/* Rings */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full border border-red-500/20 animate-ring-fade" />
                <span className="absolute inset-0 rounded-full border border-red-500/15 animate-ring-fade" style={{ animationDelay: "0.6s" }} />
                <span className="absolute inset-0 rounded-full border border-red-500/10 animate-ring-fade" style={{ animationDelay: "1.2s" }} />
              </>
            )}
            <div className={`relative w-[72px] h-[72px] rounded-full flex items-center justify-center transition-all duration-500 ${
              isListening
                ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
                : "bg-white/[0.07] hover:bg-white/[0.1] border border-white/[0.08] group-hover:border-white/[0.12]"
            }`}>
              {isListening ? (
                <StopIcon className="w-7 h-7 text-white" />
              ) : (
                <MicIcon className="w-7 h-7 text-white/60 group-hover:text-white/80 transition-colors" />
              )}
            </div>
          </button>

          <div className="mt-4 h-5 flex items-center justify-center">
            {isListening ? (
              <div className="flex items-center gap-2 animate-fade-in">
                <div className="flex items-center gap-[3px]">
                  {[0,1,2].map((i) => (
                    <div key={i} className="w-[2px] h-[2px] rounded-full bg-red-400 animate-dot-pulse" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
                <span className="text-[13px] text-white/30 font-medium">Listening in {sourceLangData?.name}</span>
              </div>
            ) : error ? (
              <span className="text-[13px] text-red-400/80 animate-fade-in">{error}</span>
            ) : (
              <span className="text-[13px] text-white/15">Tap to translate</span>
            )}
          </div>
        </div>
      </div>

      {/* Language picker */}
      {showLangPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center animate-fade-in" onClick={() => setShowLangPicker(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-xl rounded-t-[28px] p-6 pb-10 bg-[#141416] border-t border-white/[0.06] animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/10 mx-auto mb-6" />
            <h3 className="text-[17px] font-semibold mb-5 text-white/90">
              {showLangPicker === "source" ? "Translate from" : "Translate to"}
            </h3>
            <div className="grid grid-cols-3 gap-2.5">
              {LANGUAGES.map((lang) => {
                const active = showLangPicker === "source" ? lang.code === sourceLang : lang.code === targetLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (showLangPicker === "source") setSourceLang(lang.code);
                      else setTargetLang(lang.code);
                      setShowLangPicker(null);
                    }}
                    className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl transition-all active:scale-[0.95] ${
                      active
                        ? "bg-white/[0.08] border border-violet-500/30 shadow-lg shadow-violet-500/5"
                        : "bg-white/[0.03] border border-transparent hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-[22px]">{lang.flag}</span>
                    <span className="text-[12px] font-medium text-white/50">{lang.name}</span>
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
