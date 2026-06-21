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
      setError("Speech recognition is not supported in this browser. Please use Chrome or Safari.");
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
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimText(interim);

      if (final) {
        processTranscript(final);
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== "no-speech") {
        setError(`Recognition error: ${event.error}`);
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
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
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [translations]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0a0a]">
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <span className="text-xl">🌐</span> Live Translator
          </h1>
          {translations.length > 0 && (
            <button
              onClick={clearTranslations}
              className="text-sm text-white/40 hover:text-white/70 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 flex flex-col pt-14 pb-24">
        <div className="max-w-2xl mx-auto w-full px-4 py-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLangPicker("source")}
              className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <span className="text-xl">{sourceLangData?.flag}</span>
              <span className="font-medium">{sourceLangData?.name}</span>
            </button>

            <button
              onClick={swapLanguages}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors active:scale-90 shrink-0"
            >
              ⇄
            </button>

            <button
              onClick={() => setShowLangPicker("target")}
              className="flex-1 bg-white/5 hover:bg-white/10 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <span className="text-xl">{targetLangData?.flag}</span>
              <span className="font-medium">{targetLangData?.name}</span>
            </button>
          </div>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar-hide px-4"
        >
          <div className="max-w-2xl mx-auto space-y-3 pb-4">
            {translations.length === 0 && !isListening && (
              <div className="flex flex-col items-center justify-center py-20 text-white/30">
                <span className="text-6xl mb-4">🎙️</span>
                <p className="text-lg font-medium">Tap to start translating</p>
                <p className="text-sm mt-1">Speak in {sourceLangData?.name}</p>
              </div>
            )}

            {translations.map((entry) => (
              <div
                key={entry.id}
                className="animate-fade-in-up bg-white/5 rounded-xl p-4 space-y-2"
              >
                <p className="text-white/60 text-sm">{entry.original}</p>
                <p className="text-white text-base font-medium">
                  {entry.translated}
                </p>
              </div>
            ))}

            {interimText && (
              <div className="bg-white/5 rounded-xl p-4 animate-pulse">
                <p className="text-white/40 text-sm italic">{interimText}</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-8 pb-6">
        <div className="flex justify-center">
          <button
            onClick={toggleListening}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90 ${
              isListening
                ? "bg-red-500 shadow-lg shadow-red-500/30"
                : "bg-white/10 hover:bg-white/20"
            }`}
          >
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" />
                <span className="absolute inset-0 rounded-full bg-red-500 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
              </>
            )}
            <span className="relative text-3xl">
              {isListening ? "⏹️" : "🎙️"}
            </span>
          </button>
        </div>
        {isListening && (
          <p className="text-center text-white/40 text-sm mt-3">
            Listening in {sourceLangData?.name}...
          </p>
        )}
        {error && (
          <p className="text-center text-red-400 text-sm mt-3 px-4">{error}</p>
        )}
      </div>

      {showLangPicker && (
        <div
          className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          onClick={() => setShowLangPicker(null)}
        >
          <div
            className="w-full max-w-2xl bg-[#1a1a1a] rounded-t-2xl p-4 pb-8 animate-fade-in-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-3">
              {showLangPicker === "source" ? "Source Language" : "Target Language"}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {LANGUAGES.map((lang) => {
                const isSelected =
                  showLangPicker === "source"
                    ? lang.code === sourceLang
                    : lang.code === targetLang;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      if (showLangPicker === "source") {
                        setSourceLang(lang.code);
                      } else {
                        setTargetLang(lang.code);
                      }
                      setShowLangPicker(null);
                    }}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all active:scale-95 ${
                      isSelected
                        ? "bg-white/20 ring-2 ring-white/30"
                        : "bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <span className="text-2xl">{lang.flag}</span>
                    <span className="text-xs">{lang.name}</span>
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
