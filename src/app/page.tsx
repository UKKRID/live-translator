"use client";

import { useState, useCallback } from "react";
import { useTranslator } from "@/lib/useTranslator";
import { Header } from "@/components/Header";
import { LanguageBar } from "@/components/LanguageBar";
import { ModeToggle } from "@/components/ModeToggle";
import { TranslationContent } from "@/components/TranslationContent";
import { MicButton } from "@/components/MicButton";
import { LanguagePicker } from "@/components/LanguagePicker";
import { SettingsModal } from "@/components/SettingsModal";

export default function Home() {
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
