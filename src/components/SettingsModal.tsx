interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-end" onClick={onClose}>
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }} />
      <div className="relative w-full rounded-t-3xl p-5 pb-10 anim-slide" style={{ background: "#111115", border: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.08)" }} />
        <h3 className="text-[15px] font-semibold mb-5" style={{ color: "rgba(255,255,255,0.7)" }}>Settings</h3>
        <div className="mb-5">
          <label className="text-[11px] font-semibold uppercase tracking-wider block mb-2" style={{ color: "rgba(255,255,255,0.3)" }}>OpenAI API Key</label>
          <p className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,0.15)" }}>Set in .env.local on server — Tab Audio mode uses server-side Whisper</p>
          <div className="w-full h-12 px-4 rounded-xl text-[13px] flex items-center" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}>
            Configured server-side via environment variable
          </div>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[11px] mt-2 inline-block" style={{ color: "rgba(124,58,237,0.6)" }}>
            Get API key →
          </a>
        </div>
        <button onClick={onClose} className="w-full h-11 rounded-xl text-[13px] font-semibold active:scale-[0.97] transition-transform" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.2))", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.2)" }}>
          Done
        </button>
      </div>
    </div>
  );
}
