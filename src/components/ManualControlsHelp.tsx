import { ControlAction } from "../types";
import { ArrowUp, ArrowDown, HelpCircle, Gamepad2, Info } from "lucide-react";

interface ManualControlsProps {
  onManualTrigger: (action: ControlAction) => void;
  onManualCrouchRelease: () => void;
  activeAction: ControlAction;
}

export default function ManualControlsHelp({
  onManualTrigger,
  onManualCrouchRelease,
  activeAction,
}: ManualControlsProps) {
  return (
    <div id="manual-controls-help" className="bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl select-none text-neutral-200 font-sans relative overflow-hidden">
      
      {/* Title */}
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10 relative z-10">
        <div className="p-2 rounded-lg bg-white/5 border border-white/10">
          <Gamepad2 className="w-4 h-4 text-emerald-400" />
        </div>
        <h3 className="text-xs uppercase tracking-[0.2em] font-medium text-white">MANUAL OVERRIDE</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
        {/* Gestures Simulator */}
        <div className="p-5 bg-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-inner">
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-cyan-400 mb-2 flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0" /> POSE INJECTOR
            </h4>
            <p className="text-[10px] text-neutral-500 leading-relaxed mb-5">
              Click or hold triggers to simulate live Teachable Machine poses directly:
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* Jump button */}
            <button
              id="simulate-jump-btn"
              onClick={() => onManualTrigger(ControlAction.JUMP)}
              className={`w-full text-[11px] uppercase tracking-wider px-4 py-3 rounded-xl font-bold transition-all border flex items-center justify-between ${
                activeAction === ControlAction.JUMP
                  ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-50 shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300"
              }`}
            >
              <span>ASCEND / JUMP</span>
              <span className="text-[9px] bg-black/50 px-2 py-1 rounded text-neutral-400 font-mono">CLICK</span>
            </button>

            {/* Crouch button (Hold to crouch, release to stop) */}
            <button
              id="simulate-crouch-btn"
              onMouseDown={() => onManualTrigger(ControlAction.CROUCH)}
              onMouseUp={onManualCrouchRelease}
              onMouseLeave={onManualCrouchRelease}
              onTouchStart={(e) => { e.preventDefault(); onManualTrigger(ControlAction.CROUCH); }}
              onTouchEnd={(e) => { e.preventDefault(); onManualCrouchRelease(); }}
              className={`w-full text-[11px] uppercase tracking-wider px-4 py-3 rounded-xl font-bold transition-all select-none border flex items-center justify-between ${
                activeAction === ControlAction.CROUCH
                  ? "bg-violet-500/20 border-violet-400/50 text-violet-50 shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                  : "bg-white/5 hover:bg-white/10 border-white/10 text-neutral-300"
              }`}
            >
              <span>DESCEND / CROUCH</span>
              <span className="text-[9px] bg-black/50 px-2 py-1 rounded text-neutral-400 font-mono">HOLD</span>
            </button>
          </div>
        </div>

        {/* Keyboard Instructions Panel */}
        <div className="p-5 bg-neutral-950 border border-white/5 rounded-2xl flex flex-col justify-between shadow-inner">
          <div>
            <h4 className="text-[10px] uppercase font-bold tracking-widest text-emerald-400 mb-2 flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 shrink-0" /> KEYBOARD OVERRIDES
            </h4>
            <p className="text-[10px] text-neutral-500 leading-relaxed mb-5">
              Use standard arcade-style keybinds at any moment during gameplay:
            </p>
          </div>

          <div className="space-y-3 text-xs tracking-wide">
            {/* Space / Up key */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-neutral-400 text-[11px]">Jump / Ascend</span>
              <div className="flex gap-2">
                <span className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-neutral-300 font-mono">SPACE</span>
                <span className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-neutral-300 field-mono"><ArrowUp className="w-3 h-3 inline" /></span>
              </div>
            </div>

            {/* Down / S key */}
            <div className="flex items-center justify-between py-2 border-b border-white/5">
              <span className="text-neutral-400 text-[11px]">Crouch / Descend</span>
              <div className="flex gap-2">
                <span className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-neutral-300 font-mono">S</span>
                <span className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-neutral-300 font-mono"><ArrowDown className="w-3 h-3 inline" /></span>
              </div>
            </div>

            {/* Pause key */}
            <div className="flex items-center justify-between py-2">
              <span className="text-neutral-400 text-[11px]">Pause Runtime Block</span>
              <span className="bg-white/10 border border-white/10 rounded px-2 py-1 text-[9px] font-bold text-neutral-300 font-mono">P</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
