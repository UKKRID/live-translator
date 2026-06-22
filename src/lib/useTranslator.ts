import { useState, useRef, useCallback, useEffect } from "react";
import { TranslationEntry } from "./types";

export type Status = "idle" | "listening" | "processing" | "translating";
export type Mode = "mic" | "tab";

export function useTranslator(sourceLang: string, targetLang: string) {
  const [isListening, setIsListening] = useState(false);
  const [translations, setTranslations] = useState<TranslationEntry[]>([]);
  const [interimText, setInterimText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [mode, setMode] = useState<Mode>("tab");
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

  const srcLangCode = sourceLang === "auto" ? "en" : sourceLang;

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
    setStatus(listeningRef.current ? "listening" : "idle");
  }, [translateText, sourceLang]);

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
    const sl = sourceLang === "auto" ? "" : sourceLang;
    const formData = new FormData();
    formData.append("file", blob, "audio.webm");
    formData.append("model", "whisper-1");
    if (sl) formData.append("language", sl);

    const res = await fetch("/api/whisper", {
      method: "POST",
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
  }, [sourceLang]);

  useEffect(() => { sendToWhisperRef.current = sendToWhisperFn; });

  const startTabAudio = useCallback(async () => {
    setError(null);

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
              setError("Whisper failed 3 times. Check server configuration.");
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
  }, [processTranscript]);

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

  const clearTranslations = useCallback(() => {
    setTranslations([]);
    setInterimText("");
  }, []);

  return {
    isListening,
    translations,
    interimText,
    error,
    status,
    mode,
    setMode,
    retryCount,
    bottomRef,
    srcLangCode,
    startListening,
    doStop,
    clearTranslations,
    setError,
  };
}
