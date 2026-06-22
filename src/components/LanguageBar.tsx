import { Language, LANGUAGES } from "@/lib/types";

interface LanguageBarProps {
  sourceLang: string;
  targetLang: string;
  onSwap: () => void;
  onSourceClick: () => void;
  onTargetClick: () => void;
}

export function LanguageBar({ sourceLang, targetLang, onSwap, onSourceClick, onTargetClick }: LanguageBarProps) {
  const srcLang = LANGUAGES.find((l) => l.code === sourceLang)!;
  const tgtLang = LANGUAGES.find((l) => l.code === targetLang)!;

  return (
    <div className="shrink-0 px-4 py-3 flex items-center gap-2" style={{ background: "rgba(9,9,11,0.6)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <button onClick={onSourceClick} className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xl">{srcLang.flag}</span>
        <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{srcLang.name}</span>
      </button>
      <button onClick={onSwap} className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 16V4m0 0L3 8m4-4l4 4" /><path d="M17 8v12m0 0l4-4m-4 4l-4-4" /></svg>
      </button>
      <button onClick={onTargetClick} className="flex-1 h-12 rounded-xl flex items-center justify-center gap-2 transition-all" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-xl">{tgtLang.flag}</span>
        <span className="text-[13px] font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>{tgtLang.name}</span>
      </button>
    </div>
  );
}
