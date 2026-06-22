import { LANGUAGES } from "@/lib/types";

interface LanguagePickerProps {
  type: "source" | "target";
  currentLang: string;
  onSelect: (code: string) => void;
  onClose: () => void;
}

export function LanguagePicker({ type, currentLang, onSelect, onClose }: LanguagePickerProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
      <div className="relative w-full rounded-t-3xl p-5 pb-10 anim-slide" style={{ background: "#111115", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
        <h3 className="text-[15px] font-semibold mb-4" style={{ color: "rgba(255,255,255,0.7)" }}>
          {type === "source" ? "Translate from" : "Translate to"}
        </h3>
        <div className="grid grid-cols-3 gap-2 max-h-[50vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          {LANGUAGES.map((lang) => {
            const active = lang.code === currentLang;
            return (
              <button key={lang.code} onClick={() => {
                onSelect(lang.code);
                onClose();
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
  );
}
