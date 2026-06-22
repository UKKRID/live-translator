import { TranslationEntry, Mode } from "@/lib/types";
import { Status } from "@/lib/useTranslator";

interface TranslationContentProps {
  translations: TranslationEntry[];
  interimText: string;
  status: Status;
  error: string | null;
  mode: Mode;
  retryCount: number;
  bottomRef: React.RefObject<HTMLDivElement | null>;
}

export function TranslationContent({
  translations,
  interimText,
  status,
  error,
  mode,
  retryCount,
  bottomRef,
}: TranslationContentProps) {
  const srcLangName = mode === "tab" ? "Tab Audio" : "Microphone";

  return (
    <div className="flex-1 overflow-y-auto px-4 py-3" style={{ scrollbarWidth: "none" }}>
      {translations.length === 0 && status === "idle" && (
        <div className="flex flex-col items-center justify-center pt-16 pb-8">
          <div className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
            <svg className="w-10 h-10" style={{ color: "rgba(255,255,255,0.08)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></svg>
          </div>
          <p className="text-[15px] font-medium" style={{ color: "rgba(255,255,255,0.15)" }}>
            {mode === "tab" ? "Tap mic to capture tab audio" : "Tap mic to start speaking"}
          </p>
          {mode === "tab" && (
            <p className="text-[12px] mt-3 px-8 text-center leading-relaxed" style={{ color: "rgba(124,58,237,0.4)" }}>
              Tab audio mode — server-side Whisper STT
            </p>
          )}
        </div>
      )}

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

      {interimText && (
        <div className="mb-3 px-4 py-3.5 rounded-2xl anim-card" style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 anim-dot" />
            <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.18)" }}>Hearing</span>
          </div>
          <p className="text-[14px] italic leading-relaxed" style={{ color: "rgba(255,255,255,0.22)" }}>{interimText}</p>
        </div>
      )}

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

      {status === "translating" && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 mb-2" style={{ background: "rgba(124,58,237,0.05)", borderRadius: "12px" }}>
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent anim-spin" style={{ borderColor: "rgba(124,58,237,0.3)", borderTopColor: "transparent" }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(124,58,237,0.5)" }}>Translating...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
