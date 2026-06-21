"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const LANGUAGES = [
  { code: "auto", name: "Auto Detect", flag: "🌐" },
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
  detectedLang?: string;
}

export default function Home() {
  const [isListening, setIsListening] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("th");
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState<"source" | "target" | null>(null);
  const [status, setStatus] = useState<"idle" | "listening" | "processing" | "translating">("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("openai_api_key") || "";
    return "";
  });
  const [mode, setMode] = useState<"mic" | "tab">("tab");
  const [retryCount, setRetryCount] = useState(0);

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
  const retryCountRef = useRef(0);

  const srcLang = LANGUAGES.find((l) => l.code === sourceLang)!;
  const tgtLang = LANGUAGES.find((l) => l.code === targetLang)!;

  const translateText = useCallback(async (text: string): Promise<string> => {
    const sl = sourceLang === "auto" ? "en" : sourceLang;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sl}|${targetLang}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.responseData?.translatedText) return data.responseData.translatedText;
        throw new Error("No translation");
      } catch {
        if (attempt < 2) {
          try {
            const res2 = await fetch(
              `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`
            );
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2?.[0]) return data2[0].map((s: [string]) => s[0]).join("");
            }
          } catch { /* ignore */ }
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
    }
    return text;
  }, [sourceLang, targetLang]);

  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setStatus("translating");
    try {
      const translated = await translateText(text);
      setTranslations((prev) => [...prev, { id: ++idRef.current, original: text, translated, detectedLang: sourceLang === "auto" ? "detected" : undefined }]);
    } catch {
      setTranslations((prev) => [...prev, { id: ++idRef.current, original: text, translated: text }]);
    }
    setStatus(isListening ? "listening" : "idle");
  }, [translateText, isListening, sourceLang]);

  const cleanupAudio = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch { /* ignore */ }
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
      if (m.paused && !m.ended && m.readyState > 2) m.play().catch(() => {});
    });
    try { if (audioCtxRef.current?.state === "suspended") audioCtxRef.current.resume(); } catch { /* ignore */ }
  }, []);

  useEffect(() => { aggressiveResumeFn.current = aggressiveResume; });

  const doStop = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    setInterimText("");
    setStatus("idle");
    setRetryCount(0);
    retryCountRef.current = 0;
    cleanupAudio();
    clearResume();
  }, [cleanupAudio, clearResume]);

  useEffect(() => { doStopRef.current = doStop; });

  const sendToWhisperRef = useRef<(blob: Blob, attempt?: number) => Promise<string>>(async () => "");

  const sendToWhisperFn = useCallback(async (blob: Blob, attempt = 0): Promise<string> => {
    if (!apiKey) throw new Error("No API key");
    const sl = sourceLang === "auto" ? "" : sourceLang;
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    if (sl) formData.append("language", sl);
    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });
    if (!res.ok) {
      if (attempt < 2) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        return sendToWhisperRef.current(blob, attempt + 1);
      }
      throw new Error(`Whisper API error: ${res.status}`);
    }
    const data = await res.json();
    return data.text || "";
  }, [apiKey, sourceLang]);

  useEffect(() => { sendToWhisperRef.current = sendToWhisperFn; });

  const startTabAudio = useCallback(async () => {
    setError(null);
    if (!apiKey) { setError("Set OpenAI API key in Settings first"); return; }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getDisplayMedia({
        audio: { channelCount: 1, sampleRate: 16000 } as MediaTrackConstraints,
        video: true,
      });
    } catch { setError("Permission denied — allow tab audio"); return; }

    stream.getVideoTracks().forEach((t) => t.stop());
    displayStreamRef.current = stream;
    listeningRef.current = true;
    setIsListening(true);
    setStatus("listening");
    retryCountRef.current = 0;

    stream.getAudioTracks()[0].onended = () => { if (listeningRef.current) doStopRef.current(); };

    const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
    recorderRef.current = recorder;

    const sendChunk = async () => {
      if (!listeningRef.current || recorder.state !== "recording") return;
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      try { recorder.stop(); } catch { return; }
      await new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

      if (chunks.length > 0) {
        const blob = new Blob(chunks, { type: "audio/webm" });
        if (blob.size > 1000) {
          setStatus("processing");
          try {
            const text = await sendToWhisperRef.current(blob);
            if (text.trim()) { setInterimText(""); processTranscript(text); }
            retryCountRef.current = 0;
            setRetryCount(0);
          } catch (e) {
            console.error("Whisper error:", e);
            retryCountRef.current++;
            setRetryCount(retryCountRef.current);
            if (retryCountRef.current >= 3) {
              setError("Whisper failed 3 times. Check API key.");
              doStopRef.current();
              return;
            }
          }
        }
      }

      if (listeningRef.current && displayStreamRef.current) {
        setStatus("listening");
        try { recorder.start(); } catch { /* ignore */ }
      }
    };

    recorder.ondataavailable = () => {};
    recorder.start();
    recordIntervalRef.current = setInterval(sendChunk, 3000);
  }, [apiKey, processTranscript]);

  const startMic = useCallback(() => {
    setError(null);
    lastFinalRef.current = "";
    retryCountRef.current = 0;
    setRetryCount(0);

    try {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      document.querySelectorAll("video, audio").forEach((el) => {
        const media = el as HTMLMediaElement;
        if (wrappedElementsRef.current.has(media)) return;
        try { const s = ctx.createMediaElementSource(media); s.connect(ctx.destination); wrappedElementsRef.current.add(media); } catch { /* already connected */ }
      });
    } catch { /* AudioContext not available */ }

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) { setError("Use Chrome or Safari"); return; }

    const r = new API();
    r.continuous = true;
    r.interimResults = true;
    r.lang = sourceLang === "auto" ? "" : sourceLang;
    r.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "", final = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t; else interim += t;
      }
      setInterimText(interim);
      if (final && final !== lastFinalRef.current) { lastFinalRef.current = final; processTranscript(final); }
    };
    r.onerror = (e) => {
      if (e.error !== "no-speech" && e.error !== "aborted") {
        retryCountRef.current++;
        setRetryCount(retryCountRef.current);
        if (retryCountRef.current >= 5) {
          setError(`Speech error: ${e.error}`);
          setIsListening(false); listeningRef.current = false; clearResume();
        }
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
      setStatus("listening");
      aggressiveResume();
      clearResume();
      resumeIntervalRef.current = setInterval(() => aggressiveResumeFn.current(), 150);
    } catch { setError("Could not start microphone"); }
  }, [sourceLang, processTranscript, aggressiveResume, clearResume]);

  const startListening = useCallback(() => {
    if (mode === "tab") startTabAudio(); else startMic();
  }, [mode, startTabAudio, startMic]);

  useEffect(() => {
    if (bottomRef.current) bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }, [translations]);

  useEffect(() => () => { recognitionRef.current?.stop(); cleanupAudio(); clearResume(); }, [cleanupAudio, clearResume]);

  const statusText = () => {
    if (error) return error;
    if (status === "processing") return "Processing audio...";
    if (status === "translating") return "Translating...";
    if (status === "listening") return `Listening in ${srcLang.name}`;
    return "Tap to translate";
  };

  return (
    <div className="h-dvh flex flex-col" style={{ background: "linear-gradient(180deg, #0c0c14 0%, #09090b 50%, #0c0c14 100%)" }}>
      {/* Header */}
      <header className="shrink-0 px-5 h-14 flex items-center justify-between" style={{ background: "rgba(9,9,11,0.85)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px) saturate(180%)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #7c3aed, #6366f1)", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 12h2M6 8v8M10 5v14M14 8v8M18 10v4M22 12h0" /></svg>
          </div>
          <div>
            <span className="text-sm font-semibold block leading-tight" style={{ color: "rgba(255,255,255,0.9)" }}>Live Translator</span>
            <span className="text-[10px] block leading-tight" style={{ color: "rgba(255,255,255,0.2)" }}>{mode === "tab" ? "Tab Audio + Whisper" : "Speech Recognition"}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {translations.length > 0 && (
            <button onClick={() => { setTranslations([]); setInterimText(""); }} className="text-[11px] px-3 py-1.5 rounded-lg font-medium" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}>Clear</button>
          )}
          <button onClick={() => setShowSettings(true)} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
            <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      {/* Language bar */}
      <div className="shrink-0 px-4 py-3 flex items-center gap-2" style={{ background: "rgba(9,9,11,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <button onClick={() => setShowLangPicker("source")} className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xl">{srcLang.flag}</span>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{srcLang.name}</span>
        </button>
        <button onClick={() => { setSourceLang(targetLang); setTargetLang(sourceLang === "auto" ? "en" : sourceLang); }} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
        </button>
        <button onClick={() => setShowLangPicker("target")} className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xl">{tgtLang.flag}</span>
          <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{tgtLang.name}</span>
        </button>
      </div>

      {/* Mode toggle */}
      <div className="shrink-0 px-4 py-2.5 flex gap-2" style={{ background: "rgba(9,9,11,0.4)" }}>
        <button onClick={() => setMode("tab")} className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]" style={{
          background: mode === "tab" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
          color: mode === "tab" ? "#a78bfa" : "rgba(255,255,255,0.3)",
          border: mode === "tab" ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
        }}>📺 Tab Audio</button>
        <button onClick={() => setMode("mic")} className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]" style={{
          background: mode === "mic" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
          color: mode === "mic" ? "#f87171" : "rgba(255,255,255,0.3)",
          border: mode === "mic" ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
        }}>🎤 Microphone</button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
        {/* Empty state */}
        {translations.length === 0 && status === "idle" && (
          <div className="flex flex-col items-center justify-center pt-16 pb-8">
            <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
              <svg className="w-10 h-10" style={{ color: "rgba(255,255,255,0.08)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            </div>
            <p className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>
              {mode === "tab" ? "Tap mic to capture tab audio" : "Tap mic to start speaking"}
            </p>
            {mode === "tab" && !apiKey && (
              <p className="text-[12px] mt-3 px-8 text-center leading-relaxed" style={{ color: "rgba(239,68,68,0.4)" }}>
                OpenAI API key required for Tab Audio mode. Tap ⚙ to set up.
              </p>
            )}
          </div>
        )}

        {/* Listening animation */}
        {(status === "listening" || status === "processing") && translations.length === 0 && !interimText && (
          <div className="flex flex-col items-center justify-center pt-12 pb-8">
            <div className="relative mb-8">
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-36 h-36 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.04)" }} /></div>
              <div className="absolute inset-0 flex items-center justify-center"><div className="w-48 h-48 rounded-full anim-ring" style={{ border: "1px solid rgba(255,255,255,0.025)", animationDelay: "0.8s" }} /></div>
              <div className="relative w-24 h-24 rounded-3xl flex items-center justify-center anim-breathe" style={{
                background: status === "processing" ? "linear-gradient(135deg, #f59e0b, #d97706)" : "linear-gradient(135deg, #ef4444, #dc2626)",
                boxShadow: status === "processing" ? "0 8px 32px rgba(245,158,11,0.25)" : "0 8px 32px rgba(239,68,68,0.25)",
              }}>
                {status === "processing" ? (
                  <svg className="w-10 h-10 text-white anim-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
                ) : (
                  <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
                )}
              </div>
            </div>
            <p className="text-[15px] font-semibold" style={{ color: status === "processing" ? "rgba(245,158,11,0.6)" : "rgba(255,255,255,0.4)" }}>
              {status === "processing" ? "Processing audio..." : "Listening..."}
            </p>
            <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.12)" }}>
              {mode === "tab" ? "Capturing tab audio — YouTube keeps playing" : "Speak into microphone"}
            </p>
            <div className="flex items-end gap-[3px] mt-5 h-6">
              {[0,1,2,3,4,5,6,7,8,9,10].map((i) => (
                <div key={i} className="w-[2.5px] rounded-full anim-eq" style={{ background: status === "processing" ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.12)", animationDelay: `${i * 0.06}s`, animationDuration: `${0.3 + (i % 4) * 0.1}s` }} />
              ))}
            </div>
            {retryCount > 0 && (
              <p className="text-[10px] mt-3" style={{ color: "rgba(245,158,11,0.5)" }}>Retry {retryCount}/3...</p>
            )}
          </div>
        )}

        {/* Interim */}
        {interimText && (
          <div className="mb-3 px-4 py-3.5 rounded-2xl anim-card" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 anim-dot" />
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.18)" }}>Hearing</span>
            </div>
            <p className="text-[14px] italic leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>{interimText}</p>
          </div>
        )}

        {/* Translations */}
        {translations.map((entry) => (
          <div key={entry.id} className="mb-2.5 rounded-2xl overflow-hidden anim-card" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <div className="px-4 pt-3.5 pb-2.5">
              <p className="text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.25)" }}>{entry.original}</p>
            </div>
            <div className="h-px mx-4" style={{ background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.15), transparent)" }} />
            <div className="px-4 pt-2.5 pb-3.5">
              <p className="text-[15px] font-semibold leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{entry.translated}</p>
            </div>
          </div>
        ))}

        {/* Translating indicator */}
        {status === "translating" && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 mb-2" style={{ background: "rgba(124,58,237,0.05)", borderRadius: "12px" }}>
            <div className="w-4 h-4 rounded-full border-2 border-t-transparent anim-spin" style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "transparent" }} />
            <span className="text-[11px] font-medium" style={{ color: "rgba(124,58,237,0.5)" }}>Translating...</span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Mic bar */}
      <div className="shrink-0 px-5 pb-6 pt-3 flex flex-col items-center" style={{ background: "linear-gradient(to top, rgba(9,9,11,1) 50%, transparent)" }}>
        {/* Status pill */}
        <div className="mb-4 px-4 py-1.5 rounded-full" style={{ background: error ? "rgba(239,68,68,0.1)" : status === "processing" ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${error ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}` }}>
          <span className="text-[11px] font-medium" style={{ color: error ? "#ef4444" : status === "processing" ? "#f59e0b" : "rgba(255,255,255,0.2)" }}>{statusText()}</span>
        </div>

        {/* Mic button */}
        <button onClick={() => { if (isListening) doStop(); else startListening(); }} className="relative active:scale-95 transition-transform">
          {isListening && (
            <>
              <span className="absolute inset-[-6px] rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.15)" }} />
              <span className="absolute inset-[-12px] rounded-full anim-ring-fade" style={{ border: "1px solid rgba(239,68,68,0.08)", animationDelay: "0.6s" }} />
            </>
          )}
          <div className="w-[68px] h-[68px] rounded-full flex items-center justify-center transition-all duration-300" style={{
            background: isListening ? "linear-gradient(135deg, #ef4444, #dc2626)" : "rgba(255,255,255,0.06)",
            border: isListening ? "none" : "1px solid rgba(255,255,255,0.08)",
            boxShadow: isListening ? "0 0 32px rgba(239,68,68,0.3), 0 8px 24px rgba(239,68,68,0.2)" : "none",
          }}>
            {isListening ? (
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3" /></svg>
            ) : (
              <svg className="w-7 h-7" style={{ color: "rgba(255,255,255,0.45)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
            )}
          </div>
        </button>
      </div>

      {/* Language picker */}
      {showLangPicker && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={() => setShowLangPicker(null)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
          <div className="relative w-full rounded-t-3xl p-5 pb-10 anim-slide" style={{ background: "#111115", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
            <h3 className="text-[15px] font-semibold mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
              {showLangPicker === "source" ? "Translate from" : "Translate to"}
            </h3>
            <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
              {LANGUAGES.map((lang) => {
                const active = showLangPicker === "source" ? lang.code === sourceLang : lang.code === targetLang;
                return (
                  <button key={lang.code} onClick={() => {
                    if (showLangPicker === "source") setSourceLang(lang.code); else setTargetLang(lang.code);
                    setShowLangPicker(null);
                  }} className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl transition-all active:scale-95" style={{
                    background: active ? "rgba(124,58,237,0.12)" : "rgba(255,255,255,0.03)",
                    border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
                  }}>
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-[11px] font-medium" style={{ color: active ? "rgba(167,139,250,1)" : "rgba(255,255,255,0.35)" }}>{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Settings */}
      {showSettings && (
        <div className="absolute inset-0 z-50 flex items-end" onClick={() => setShowSettings(false)}>
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
          <div className="relative w-full rounded-t-3xl p-5 pb-10 anim-slide" style={{ background: "#111115", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
            <h3 className="text-[15px] font-semibold mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>Settings</h3>
            <div className="mb-5">
              <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>OpenAI API Key</label>
              <p className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,0.15)" }}>Required for Tab Audio mode (Whisper STT)</p>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("openai_api_key", e.target.value); }}
                placeholder="sk-..."
                className="w-full h-12 px-4 rounded-xl text-[13px] outline-none transition-colors"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.8)" }}
              />
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[11px] mt-2 inline-block" style={{ color: "rgba(124,58,237,0.6)" }}>
                Get API key →
              </a>
            </div>
            <button onClick={() => setShowSettings(false)} className="w-full h-11 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-transform" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
