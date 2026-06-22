import { Mode } from "@/lib/types";

interface HeaderProps {
  mode: Mode;
  translationCount: number;
  onClear: () => void;
  onSettings: () => void;
}

export function Header({ mode, translationCount, onClear, onSettings }: HeaderProps) {
  return (
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
        {translationCount > 0 && (
          <button onClick={onClear} className="text-[11px] px-3 py-1.5 rounded-lg font-medium" style={{ color: "rgba(255,255,255,0.3)", background: "rgba(255,255,255,0.04)" }}>Clear</button>
        )}
        <button onClick={onSettings} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,0.04)" }}>
          <svg className="w-4 h-4" style={{ color: "rgba(255,255,255,0.35)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
        </button>
      </div>
    </header>
  );
}
