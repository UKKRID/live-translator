import { Mode } from "@/lib/types";

interface ModeToggleProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

export function ModeToggle({ mode, onModeChange }: ModeToggleProps) {
  return (
    <div className="shrink-0 px-4 py-2.5 flex gap-2" style={{ background: "rgba(9,9,11,0.4)" }}>
      <button onClick={() => onModeChange("tab")} className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]" style={{
        background: mode === "tab" ? "rgba(124,58,237,0.15)" : "rgba(255,255,255,0.03)",
        color: mode === "tab" ? "#a78bfa" : "rgba(255,255,255,0.3)",
        border: mode === "tab" ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent",
      }}>📺 Tab Audio</button>
      <button onClick={() => onModeChange("mic")} className="flex-1 h-9 rounded-xl text-[12px] font-semibold transition-all active:scale-[0.97]" style={{
        background: mode === "mic" ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.03)",
        color: mode === "mic" ? "#f87171" : "rgba(255,255,255,0.3)",
        border: mode === "mic" ? "1px solid rgba(239,68,68,0.25)" : "1px solid transparent",
      }}>🎤 Microphone</button>
    </div>
  );
}
