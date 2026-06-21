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
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("th");
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<"source" | "target" | null>(null);
  const [translating, setTranslating] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const lastFinalRef = useRef("");
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  const srcLang = LANGUAGES.find((l) => l.code === sourceLang)!;
  const tgtLang = LANGUAGES.find((l) => l.code === targetLang)!;

  const translateText = useCallback(async (text: string): Promise<string> => {
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.responseData?.translatedText) return data.responseData.translatedText;
      throw new Error("No translation");
    } catch {
      try {
        const res2 = await fetch(
          `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceLang}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
        );
        if (res2.ok) {
          const data2 = await res2.json();
          if (data2?.[0]) return data2[0].map((s: [string]) => s[0]).join("");
        }
      } catch { /* ignore */ }
      return text;
    }
  }, [sourceLang, targetLang]);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setTranslating(true);
    const translated = await translateText(text);
    setTranslations((prev) => [...prev, { id: ++idRef.current, original: text, translated }]);
    setTranslating(false);
  }, [translateText]);

  const resumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const resumeAllMedia = useCallback(() => {
    document.querySelectorAll("video, audio").forEach((el) => {
      const media = el as HTMLMediaElement;
      if (media.paused && !media.ended && media.readyState > 2) {
        media.play().catch(() => {});
      }
    });
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    lastFinalRef.current = "";
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      setError("Use Chrome or Safari for speech recognition");
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
      if (final && final !== lastFinalRef.current) {
        lastFinalRef.current = final;
        processTranscript(final);
      }
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        setError(`Speech error: ${e.error}`);
        setIsListening(false);
        listeningRef.current = false;
      }
    };
    r.onend = () => {
      if (listeningRef.current) {
        try { r.start(); } catch { setIsListening(false); listeningRef.current = false; }
      }
    };
    recognitionRef.current = r;
    try {
      r.start();
      setIsListening(true);
      listeningRef.current = true;
      resumeAllMedia();
      if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = setInterval(resumeAllMedia, 800);
    } catch { setError("Could not start microphone"); }
  }, [sourceLang, processTranscript, resumeAllMedia]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    if (resumeIntervalRef.current) { clearInterval(resumeIntervalRef.current); resumeIntervalRef.current = null; }
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
  }, []);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    if (resumeIntervalRef.current) clearInterval(resumeIntervalRef.current);
  }, []);

  return (
    <div className="h-dvh flex flex-col" style={{ background: "#09090b" }}>
      {/* HEADER */}
      <header className="shrink-0 px-5 h-14 flex items-center justify-between" style={{ background: "rgba(9,9,11,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" /></svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Live Translator</span>
        </div>
        {translations.length > 0 && (
          <button onClick={() => { setTranslations([]); setInterimText(""); }} className="text-xs px-3 py-1 rounded-full" style={{ color: "rgba(255,255,255,0.3)" }}>Clear</button>
        )}
      </header>

      {/* LANG BAR */}
      <div className="shrink-0 px-5 py-3 flex items-center gap-2" style={{ background: "rgba(9,9,11,0.7)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <button onClick={() => setShowLangPicker("source")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-lg">{srcLang.flag}</span>
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{srcLang.name}</span>
        </button>
        <button onClick={() => { setSourceLang(targetLang); setTargetLang(sourceLang); }} className="w-9 h-9 shrink-0 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
        </button>
        <button onClick={() => setShowLangPicker("target")} className="flex-1 h-11 rounded-xl flex items-center justify-center gap-2.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-lg">{tgtLang.flag}</span>
          <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{tgtLang.name}</span>
        </button>
      </div>

      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        {/* Empty state */}
        {translations.length === 0 && !isListening && !interimText && (
          <div className="flex flex-col items-center justify-center pt-24 pb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <svg className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.18)" }}>Tap the mic to start</p>
          </div>
        )}

        {/* Listening state */}
        {isListening && translations.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center pt-20 pb-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-32 h-32 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.05)" }} /></div>
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-44 h-44 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.03)", animationDelay: "1s" }} /></div>
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center anim-breathe" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 8px 32px rgba(239,68,68,0.25)" }}>
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
              </div>
            </div>
            <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Listening...</p>
            <div className="flex items-end gap-[3px] mt-5 h-6">
              {[0,1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="w-[2px] rounded-full anim-eq" style={{ background: "rgba(255,255,255,0.15)", animationDelay: `${i * 0.08}s`, animationDuration: `${0.3 + (i % 3) * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {/* Interim */}
        {interimText && (
          <div className="mb-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 anim-dot" />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Hearing</span>
            </div>
            <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.25)" }}>{interimText}</p>
          </div>
        )}

        {/* Translations */}
        {translations.map((entry) => (
          <div key={entry.id} className="mb-3 rounded-xl overflow-hidden anim-card" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="px-4 pt-3 pb-2">
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>{entry.original}</p>
            </div>
            <div className="h-px mx-4" style={{ background: "rgba(255,255,255,0.04)" }} />
            <div className="px-4 pt-2 pb-3">
              <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{entry.translated}</p>
            </div>
          </div>
        ))}

        {translating && (
          <div className="flex items-center gap-2 px-4 py-2">
            <div className="w-1.5 h-1.5 rounded-full anim-dot" style={{ background: "rgba(255,255,255,0.2)" }} />
            <span className="text-[11px]" style={{ color: "rgba(255,255,255,0.15)" }}>Translating...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* MIC BAR — not fixed, just at bottom of flex layout */}
      <div className="shrink-0 px-5 pb-8 pt-4 flex flex-col items-center" style={{ background: "linear-gradient(to top, #09090b 60%, transparent)" }}>
        <button onClick={() => { if (isListening) stopListening(); else startListening(); }} className="relative">
          {isListening && (
            <>
              <span className="absolute inset-0 rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.2)" }} />
              <span className="absolute inset-0 rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.12)", animationDelay: "0.7s" }} />
            </>
          )}
          <div className="w-[64px] h-[64px] rounded-full flex items-center justify-center transition-all duration-300" style={{
            background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(255,255,255,0.07)",
            border: isListening ? "none" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isListening ? "0 0 28px rgba(239,68,68,0.25)" : "none",
          }}>
            {isListening ? (
              <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            ) : (
              <svg className="w-6 h-6" style={{ color: "rgba(255,255,255,0.5)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            )}
          </div>
        </button>
        <div className="mt-3 h-4 flex items-center justify-center">
          {error ? (
            <span className="text-[12px]" style={{ color: "#ef4444" }}>{error}</span>
          ) : isListening ? (
            <span className="text-[12px] anim-fade" style={{ color: "rgba(255,255,255,0.25)" }}>Listening in {srcLang.name}</span>
          ) : (
            <span className="text-[12px]" style={{ color: "rgba(255,255,255,0.1)" }}>Tap to translate</span>
          )}
        </div>
      </div>

      {/* LANGUAGE PICKER */}
      {showLangPicker && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={() => setShowLangPicker(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div className="relative w-full rounded-t-2xl p-5 pb-8 anim-slide" style={{ background: "#141416", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
            <h3 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              {showLangPicker === "source" ? "Translate from" : "Translate to"}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const active = showLangPicker === "source" ? lang.code === sourceLang : lang.code === targetLang;
                return (
                  <button key={lang.code} onClick={() => {
                    if (showLangPicker === "source") setSourceLang(lang.code); else setTargetLang(lang.code);
                    setShowLangPicker(null);
                  }} className="flex flex-col items-center gap-1.5 py-3 rounded-xl transition-colors" style={{
                    background: active ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
                    border: active ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
                  }}>
                    <span className="text-xl">{lang.flag}</span>
                    <span className="text-[11px] font-medium" style={{ color: active ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.35)" }}>{lang.name}</span>
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
