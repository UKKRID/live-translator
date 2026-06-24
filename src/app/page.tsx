"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslator } from "@/lib/useTranslator";
import { Header } from "@/components/Header";
import { LanguageBar } from "@/components/LanguageBar";
import { ModeToggle } from "@/components/ModeToggle";
import { TranslationContent } from "@/components/TranslationContent";
import { MicButton } from "@/components/MicButton";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SettingsModal } from "@/components/SettingsModal";

function isDesktopDevice() {
  if (typeof window === "undefined") return true;
  return !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function DesktopBlocked() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-5" style={{ background: "#0c0c14" }}>
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-5">📱</div>
        <h1 className="text-2xl font-bold text-white mb-3">Mobile Only</h1>
        <p className="text-gray-400 text-base leading-relaxed mb-5">
          Live Translator ต้องใช้งานบน <span className="text-green-400 font-semibold">มือถือ</span> เท่านั้น
        </p>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5">
          <p className="text-gray-400 text-sm leading-relaxed">
            สาเหตุ: ฟีเจอร์จับเสียงไมค์ microfon ใช้งานได้ดีที่สุดบนมือถือ
          </p>
        </div>
        <p className="text-gray-500 text-xs">
          กรุณาเปิดบน Safari หรือ Chrome บนมือถือ
        </p>
      </div>
    </div>
  );
}

export default function Home() {
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    setIsDesktop(isDesktopDevice());
  }, []);

  if (!isDesktop) {
    return <DesktopBlocked />;
  }

  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("th");
  const [showLangPicker, setShowLangPicker] = useState<"source" | "target" | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const {
    isListening,
    translations,
    interimText,
    error,
    status,
    mode,
    setMode,
    retryCount,
    bottomRef,
    startListening,
    doStop,
    clearTranslations,
  } = useTranslator(sourceLang, targetLang);

  const handleSwap = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang === "auto" ? "en" : sourceLang);
  }, [sourceLang, targetLang]);

  return (
    <div className="h-dvh flex flex-col" style={{ background: "linear-gradient(180deg, #0c0c14 0%, #09090b 50%, #0c0c14 100%)" }}>
      <Header
        mode={mode}
        translationCount={translations.length}
        onClear={clearTranslations}
        onSettings={() => setShowSettings(true)}
      />

      <LanguageBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSwap={handleSwap}
        onSourceClick={() => setShowLangPicker("source")}
        onTargetClick={() => setShowLangPicker("target")}
      />

      <ModeToggle mode={mode} onModeChange={setMode} />

      <TranslationContent
        translations={translations}
        interimText={interimText}
        status={status}
        error={error}
        mode={mode}
        retryCount={retryCount}
        bottomRef={bottomRef}
      />

      <MicButton
        isListening={isListening}
        status={status}
        error={error}
        onToggle={() => (isListening ? doStop() : startListening())}
      />

      {showLangPicker && (
        <LanguagePicker
          type={showLangPicker}
          currentLang={showLangPicker === "source" ? sourceLang : targetLang}
          onSelect={(code) => {
            if (showLangPicker === "source") setSourceLang(code);
            else setTargetLang(code);
          }}
          onClose={() => setShowLangPicker(null)}
        />
      )}

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  );
}
