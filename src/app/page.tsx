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

  const showEmpty = translations.length === 0 && !isListening && !interimText;
  const showListening = isListening && translations.length === 0 && !interimText;

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative" style={{ background: "#09090b" }}>
      {/* Subtle ambient light */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-[0.03] blur-[80px]" style={{ background: "radial-gradient(circle, #7c3aed, transparent)" }} />
        <div className="absolute -bottom-40 -right-40 w-80 h-80 rounded-full opacity-[0.03] blur-[80px]" style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
      </div>

      {/* ===== HEADER ===== */}
      <header className="relative z-50 shrink-0 border-b" style={{ borderColor: "rgba(255,255,255,0.05)", background: "rgba(9,9,11,0.85)", backdropFilter: "blur(20px)" }}>
        <div className="mx-auto max-w-lg px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" /></svg>
            </div>
            <span className="text-sm font-semibold text-white/90">Live Translator</span>
          </div>
          {translations.length > 0 && (
            <button onClick={clearTranslations} className="text-xs font-medium px-3 py-1 rounded-full transition-colors" style={{ color: "rgba(255,255,255,0.3)" }}>
              Clear
            </button>
          )}
        </div>
      </header>

      {/* ===== LANGUAGE SELECTOR ===== */}
      <div className="relative z-40 shrink-0" style={{ background: "rgba(9,9,11,0.7)", backdropFilter: "blur(16px)" }}>
        <div className="mx-auto max-w-lg px-5 py-3 flex items-center gap-2">
          <button onClick={() => setShowLangPicker("source")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5 transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-lg">{sourceLangData?.flag}</span>
            <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{sourceLangData?.name}</span>
          </button>
          <button onClick={swapLanguages} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.45)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
          </button>
          <button onClick={() => setShowLangPicker("target")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5 transition-colors" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-lg">{targetLangData?.flag}</span>
            <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.75)" }}>{targetLangData?.name}</span>
          </button>
        </div>
      </div>

      {/* ===== CONTENT (scrollable) ===== */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto relative z-10" style={{ scrollbarWidth: "none" }}>
        <div className="mx-auto max-w-lg px-5 py-6 space-y-3 min-h-full flex flex-col">
          {/* Empty state */}
          {showEmpty && (
            <div className="flex-1 flex flex-col items-center justify-center pb-16">
              <div className="mb-5 p-5 rounded-3xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                <svg className="w-12 h-12" style={{ color: "rgba(255,255,255,0.12)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              </div>
              <p className="text-base font-medium" style={{ color: "rgba(255,255,255,0.2)" }}>Tap the button below</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.1)" }}>to start translating {sourceLangData?.name}</p>
            </div>
          )}

          {/* Listening animation */}
          {showListening && (
            <div className="flex-1 flex flex-col items-center justify-center pb-16">
              <div className="relative mb-8">
                {/* Ripple rings */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full anim-ring1" style={{ border: "1px solid rgba(255,255,255,0.04)" }} />
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-48 rounded-full anim-ring2" style={{ border: "1px solid rgba(255,255,255,0.03)" }} />
                </div>
                {/* Mic core */}
                <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center anim-mic-pulse" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 8px 32px rgba(239,68,68,0.3)" }}>
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                </div>
              </div>
              <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>Listening...</p>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>Speak in {sourceLangData?.name}</p>
              {/* EQ bars */}
              <div className="flex items-end gap-[3px] mt-6 h-7">
                {[0,1,2,3,4,5,6,7,8].map((i) => (
                  <div key={i} className="w-[3px] rounded-full anim-eq" style={{ background: "rgba(255,255,255,0.15)", animationDelay: `${i * 0.07}s`, animationDuration: `${0.35 + (i % 4) * 0.12}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* Interim */}
          {interimText && (
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 anim-pulse-dot" />
                <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Listening</span>
              </div>
              <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.25)" }}>{interimText}</p>
            </div>
          )}

          {/* Translation cards */}
          {translations.map((entry, idx) => (
            <div key={entry.id} className="rounded-2xl overflow-hidden anim-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", animationDelay: `${Math.min(idx * 0.04, 0.2)}s` }}>
              <div className="px-4 pt-3.5 pb-3">
                <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>{entry.original}</p>
              </div>
              <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.04)" }} />
              <div className="px-4 pt-2.5 pb-3.5">
                <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{entry.translated}</p>
              </div>
            </div>
          ))}

          {/* Spacer for bottom bar */}
          <div className="shrink-0 h-4" />
        </div>
      </main>

      {/* ===== BOTTOM MIC BAR ===== */}
      <div className="absolute bottom-0 inset-x-0 z-50">
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, #09090b 30%, transparent)" }} />
        <div className="relative mx-auto max-w-lg flex flex-col items-center pt-10 pb-8">
          <button onClick={toggleListening} className="relative">
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.2)" }} />
                <span className="absolute inset-0 rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.12)", animationDelay: "0.6s" }} />
                <span className="absolute inset-0 rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.08)", animationDelay: "1.2s" }} />
              </>
            )}
            <div className="w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-300" style={{
              background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(255,255,255,0.07)",
              border: isListening ? "none" : "1px solid rgba(255,255,255,0.08)",
              boxShadow: isListening ? "0 0 32px rgba(239,68,68,0.3)" : "none",
            }}>
              {isListening ? (
                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
              ) : (
                <svg className="w-6 h-6" style={{ color: "rgba(255,255,255,0.55)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" x2="12" y1="19" y2="22" />
                </svg>
              )}
            </div>
          </button>
          <div className="mt-3.5 h-5 flex items-center">
            {isListening ? (
              <span className="text-xs font-medium anim-fade-in" style={{ color: "rgba(255,255,255,0.3)" }}>Listening in {sourceLangData?.name}</span>
            ) : error ? (
              <span className="text-xs font-medium anim-fade-in" style={{ color: "#ef4444" }}>{error}</span>
            ) : (
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.12)" }}>Tap to translate</span>
            )}
          </div>
        </div>
      </div>

      {/* ===== LANGUAGE PICKER ===== */}
      {showLangPicker && (
        <div className="absolute inset-0 z-[100] flex items-end anim-fade-in" onClick={() => setShowLangPicker(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
          <div className="relative w-full rounded-t-[24px] p-5 pb-8 anim-slide-up" style={{ background: "#141416", borderTop: "1px solid rgba(255,255,255,0.06)" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.1)" }} />
            <h3 className="text-base font-semibold mb-4" style={{ color: "rgba(255,255,255,0.8)" }}>
              {showLangPicker === "source" ? "Translate from" : "Translate to"}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const active = showLangPicker === "source" ? lang.code === sourceLang : lang.code === targetLang;
                return (
                  <button key={lang.code} onClick={() => {
                    if (showLangPicker === "source") setSourceLang(lang.code); else setTargetLang(lang.code);
                    setShowLangPicker(null);
                  }} className="flex flex-col items-center gap-1.5 py-3.5 px-2 rounded-xl transition-colors" style={{
                    background: active ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                    border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                  }}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-[11px] font-medium" style={{ color: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)" }}>{lang.name}</span>
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
