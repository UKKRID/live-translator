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
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("openai_api_key") || "";
    return "";
  });
  const [mode, setMode] = useState<"mic" | "tab">("tab");

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listeningRef = useRef(false);
  const lastFinalRef = useRef("");
  const idRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const resumeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const wrappedElementsRef = useRef<WeakSet<HTMLMediaElement>>(new WeakSet());

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

  const cleanupAudio = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    recorderRef.current = null;
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (recordIntervalRef.current) {
      clearInterval(recordIntervalRef.current);
      recordIntervalRef.current = null;
    }
  }, []);

  const clearResume = useCallback(() => {
    if (resumeIntervalRef.current) {
      clearInterval(resumeIntervalRef.current);
      resumeIntervalRef.current = null;
    }
  }, []);

  const aggressiveResumeFn = useRef(() => {});
  const doStopRef = useRef<() => void>(() => {});

  const aggressiveResume = useCallback(() => {
    document.querySelectorAll("video, audio").forEach((el) => {
      const m = el as HTMLMediaElement;
      if (m.paused && !m.ended && m.readyState > 2) {
        m.play().catch(() => {});
      }
    });
    try {
      if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume();
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { aggressiveResumeFn.current = aggressiveResume; });

  const doStop = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    cleanupAudio();
    clearResume();
  }, [cleanupAudio, clearResume]);

  useEffect(() => { doStopRef.current = doStop; });

  const sendToWhisper = useCallback(async (blob: Blob): Promise<string> => {
    if (!apiKey) throw new Error("No API key");
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", sourceLang);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    if (!res.ok) throw new Error(`Whisper API error: ${res.status}`);
    const data = await res.json();
    return data.text || "";
  }, [apiKey, sourceLang]);

  const startTabAudio = useCallback(async () => {
    setError(null);
    if (!apiKey) {
      setError("Set OpenAI API key in Settings first");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        audio: { channelCount: 1, sampleRate: 16000 } as MediaTrackConstraints,
        video: true,
      });
    } catch {
      setError("Permission denied — allow tab audio");
      return;
    }

    stream.getVideoTracks().forEach((t) => t.stop());
    displayStreamRef.current = stream;
    listeningRef.current = true;
    setIsListening(true);

    stream.getAudioTracks()[0].onended = () => {
      if (listeningRef.current) doStopRef.current();
    };

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    recorderRef.current = recorder;

    const sendChunk = async () => {
      if (!listeningRef.current || recorder.state !== "recording") return;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.stop();
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 1000) {
          try {
            const text = await sendToWhisper(blob);
            if (text.trim()) { setInterimText(""); processTranscript(text); }
          } catch (e) { console.error("Whisper error:", e); }
        }
      }
      if (listeningRef.current) {
        try { recorder.start(); } catch { /* ignore */ }
      }
    };

    recorder.ondataavailable = () => {};
    recorder.start();
    recordIntervalRef.current = setInterval(sendChunk, 3000);
  }, [apiKey, sendToWhisper, processTranscript]);

  const startMic = useCallback(() => {
    setError(null);
    lastFinalRef.current = "";

    // Hijack media elements through AudioContext
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      document.querySelectorAll("video, audio").forEach((el) => {
        const media = el as HTMLMediaElement;
        if (wrappedElementsRef.current.has(media)) return;
        try {
          const source = ctx.createMediaElementSource(media);
          source.connect(ctx.destination);
          wrappedElementsRef.current.add(media);
        } catch { /* already connected */ }
      });
    } catch { /* AudioContext not available */ }

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) { setError("Use Chrome or Safari"); return; }

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
        setError(`Error: ${e.error}`);
        setIsListening(false);
        listeningRef.current = false;
        clearResume();
      }
    };
    r.onend = () => {
      if (listeningRef.current) {
        try { r.start(); } catch { setIsListening(false); listeningRef.current = false; clearResume(); }
      }
    };

    recognitionRef.current = r;
    try {
      r.start();
      setIsListening(true);
      listeningRef.current = true;
      aggressiveResume();
      clearResume();
      resumeIntervalRef.current = setInterval(() => aggressiveResumeFn.current(), 150);
    } catch { setError("Could not start microphone"); }
  }, [sourceLang, processTranscript, aggressiveResume, clearResume]);

  const startListening = useCallback(() => {
    if (mode === "tab") startTabAudio(); else startMic();
  }, [mode, startTabAudio, startMic]);

  const stopListening = doStop;

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
    cleanupAudio();
    clearResume();
  }, [cleanupAudio, clearResume]);

  return (
    <div className="h-dvh flex flex-col" style={{ background: "#09090b" }}>
      <header className="shrink-0 px-5 h-14 flex items-center justify-between" style={{ background: "rgba(9,9,11,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #4f46e5)" }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" /></svg>
          </div>
          <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Live Translator</span>
        </div>
        <div className="flex items-center gap-2">
          {translations.length > 0 && (
            <button onClick={() => { setTranslations([]); setInterimText(""); }} className="text-xs px-3 py-1 rounded-full" style={{ color: "rgba(255,255,255,0.3)" }}>Clear</button>
          )}
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
            <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </header>

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

      <div className="shrink-0 px-5 py-2 flex gap-2" style={{ background: "rgba(9,9,11,0.5)", borderBottom: "1px solid rgba(255,255,255,0.03)" }}>
        <button onClick={() => setMode("tab")} className="flex-1 h-8 rounded-lg text-[11px] font-medium transition-all" style={{
          background: mode === "tab" ? "rgba(124,58,237,0.2)" : "rgba(255,255,255,0.03)",
          color: mode === "tab" ? "rgba(167,139,250,1)" : "rgba(255,255,255,0.3)",
          border: mode === "tab" ? "1px solid rgba(124,58,237,0.3)" : "1px solid transparent",
        }}>Tab Audio</button>
        <button onClick={() => setMode("mic")} className="flex-1 h-8 rounded-lg text-[11px] font-medium transition-all" style={{
          background: mode === "mic" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.03)",
          color: mode === "mic" ? "rgba(248,113,113,1)" : "rgba(255,255,255,0.3)",
          border: mode === "mic" ? "1px solid rgba(239,68,68,0.3)" : "1px solid transparent",
        }}>Microphone</button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4" style={{ scrollbarWidth: "none" }}>
        {translations.length === 0 && !isListening && !interimText && (
          <div className="flex flex-col items-center justify-center pt-20 pb-8">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
              <svg className="w-8 h-8" style={{ color: "rgba(255,255,255,0.1)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.18)" }}>
              {mode === "tab" ? "Tap mic → select YouTube tab audio" : "Tap mic to start"}
            </p>
            {mode === "tab" && !apiKey && (
              <p className="text-[11px] mt-2 px-6 text-center" style={{ color: "rgba(239,68,68,0.5)" }}>
                ⚠ OpenAI API key required — tap ⚙ to set
              </p>
            )}
          </div>
        )}

        {isListening && translations.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center pt-16 pb-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-32 h-32 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.05)" }} /></div>
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-44 h-44 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.03)", animationDelay: "1s" }} /></div>
              <div className="relative w-20 h-20 rounded-2xl flex items-center justify-center anim-breathe" style={{ background: "linear-gradient(135deg, #ef4444, #dc2626)", boxShadow: "0 8px 32px rgba(239,68,68,0.25)" }}>
                <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
              </div>
            </div>
            <p className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.45)" }}>Listening...</p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.15)" }}>
              {mode === "tab" ? "Capturing tab audio" : "Speak into mic"}
            </p>
            <div className="flex items-end gap-[3px] mt-5 h-6">
              {[0,1,2,3,4,5,6,7,8].map((i) => (
                <div key={i} className="w-[2px] rounded-full anim-eq" style={{ background: "rgba(255,255,255,0.15)", animationDelay: `${i * 0.08}s`, animationDuration: `${0.3 + (i % 3) * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

        {interimText && (
          <div className="mb-3 px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 anim-dot" />
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.2)" }}>Hearing</span>
            </div>
            <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.25)" }}>{interimText}</p>
          </div>
        )}

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

      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }} />
          <div className="relative w-full rounded-t-2xl p-5 pb-8 anim-slide" style={{ background: "#141416", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
            <h3 className="text-sm font-semibold mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>Settings</h3>
            <div className="mb-4">
              <label className="text-[11px] font-medium block mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>OpenAI API Key (for Tab Audio mode)</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("openai_api_key", e.target.value); }}
                placeholder="sk-..."
                className="w-full h-11 px-4 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.8)" }}
              />
              <p className="text-[10px] mt-2" style={{ color: "rgba(255,255,255,0.2)" }}>
                Used for Whisper STT. Get key at platform.openai.com
              </p>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full h-10 rounded-xl text-sm font-medium" style={{ background: "rgba(124,58,237,0.2)", color: "rgba(167,139,250,1)", border: "1px solid rgba(124,58,237,0.3)" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
