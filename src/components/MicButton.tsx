import { Status } from "@/lib/useTranslator";

interface MicButtonProps {
  isListening: boolean;
  status: Status;
  error: string | null;
  onToggle: () => void;
}

export function MicButton({ isListening, status, error, onToggle }: MicButtonProps) {
  const getStatusText = () => {
    if (error) return error;
    if (status === "processing") return "Processing audio...";
    if (status === "translating") return "Translating...";
    if (status === "listening") return "Listening...";
    return "Tap to translate";
  };

  return (
    <div className="shrink-0 px-5 pb-6 pt-3 flex flex-col items-center" style={{ background: "linear-gradient(to top, rgba(9,9,11,1) 50%, transparent)" }}>
      <div className="mb-4 px-4 py-1.5 rounded-full" style={{ background: error ? "rgba(239,68,68,0.1)" : status === "processing" ? "rgba(245,158,11,0.08)" : "rgba(255,255,255,0.03)", border: `1px solid ${error ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)"}` }}>
        <span className="text-[11px] font-medium" style={{ color: error ? "#ef4444" : status === "processing" ? "#f59e0b" : "rgba(255,255,255,0.2)" }}>{getStatusText()}</span>
      </div>

      <button onClick={onToggle} className="relative active:scale-95 transition-transform">
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
  );
}
