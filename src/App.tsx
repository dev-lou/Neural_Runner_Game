/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { GameState, ControlAction } from "./types";
import GameCanvas from "./components/GameCanvas";
import TeachableMachineController from "./components/TeachableMachineController";
import ManualControlsHelp from "./components/ManualControlsHelp";
import { Cpu, Gamepad2, Layers, Award, Sparkles, HelpCircle } from "lucide-react";

export default function App() {
  const [activeState, setActiveState] = useState<ControlAction>(ControlAction.RUN);
  const [jumpPulse, setJumpPulse] = useState<number>(0);
  const [totalResets, setTotalResets] = useState<number>(0);

  // Trigger discrete action (e.g. called on every prediction frame or click)
  const handleActionTrigger = (action: ControlAction) => {
    if (action === ControlAction.JUMP) {
      setJumpPulse(p => p + 1);
    } else {
      // Manual trigger buttons for continuous actions will force them overriding webcam temporarily
      setActiveState(action);
    }
  };

  // Change continuous active state from Teachable Machine
  const handleActiveActionChange = (action: ControlAction) => {
    // Only map continuous states
    if (action === ControlAction.RUN || action === ControlAction.STOP || action === ControlAction.CROUCH) {
      setActiveState(action);
    }
  };

  const handleManualCrouchRelease = () => {
    setActiveState(ControlAction.RUN);
  };

  const handleRestart = () => {
    setTotalResets(prev => prev + 1);
  };

  return (
    <div id="main-app-container" className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans selection:bg-cyan-500/30 overflow-x-hidden antialiased">
      
      {/* Modern 2026 Glass Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/60 backdrop-blur-2xl px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-violet-500/10 opacity-30 pointer-events-none" />
        
        <div className="relative flex items-center gap-4">
          <div className="relative p-2 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
            <Cpu className="w-5 h-5 text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 rounded-xl shadow-[inset_0_0_10px_rgba(34,211,238,0.1)] pointer-events-none" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold tracking-[0.2em] text-white flex items-center gap-2">
              VISION<span className="text-cyan-400 font-light">SYNC</span>
              <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[8px] font-mono border border-cyan-500/20">v2.6</span>
            </h1>
            <p className="text-[10px] text-neutral-500 font-medium tracking-wide">TEACHABLE MACHINE KINETIC ENGINE</p>
          </div>
        </div>

        <div className="relative flex items-center gap-4 text-xs font-medium tracking-wider">
          <div className="hidden md:flex items-center gap-2 text-neutral-400">
            <Layers className="w-4 h-4 text-neutral-500" />
            <span>SESSIONS: <span className="text-white">{totalResets}</span></span>
          </div>
          <div className="h-4 w-px bg-white/10 hidden md:block" />
          <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px]">CORE ACTIVE</span>
          </div>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left Column: Canvas + Manual Helpers */}
        <motion.div
          id="left-column-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-12 xl:col-span-8 flex flex-col gap-8"
        >
          {/* Main Gameplay Screen */}
          <section id="gameplay-canvas-section" className="relative group rounded-3xl p-1 overflow-hidden transition-all duration-500">
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-50 mix-blend-overlay rounded-3xl" />
            <div className="relative bg-neutral-900 border border-white/10 rounded-[22px] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-neutral-950/50 backdrop-blur-sm">
                <span className="text-xs tracking-[0.15em] text-neutral-400 flex items-center gap-2 font-medium">
                  <Gamepad2 className="w-4 h-4 text-cyan-400" /> KINETIC SIMULATOR
                </span>
                <span className="text-[10px] text-neutral-500 font-mono tracking-widest bg-neutral-950 px-2 py-1 rounded border border-white/5">
                  60Hz SYNC
                </span>
              </div>
              <GameCanvas
                activeState={activeState}
                jumpPulse={jumpPulse}
                onRestart={handleRestart}
              />
            </div>
            {/* Soft outer glow */}
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-violet-500/0 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000 -z-10" />
          </section>

          {/* Manual controls helper info blocks and simulated testing tiles */}
          <ManualControlsHelp
            onManualTrigger={handleActionTrigger}
            onManualCrouchRelease={handleManualCrouchRelease}
            activeAction={activeState}
          />
        </motion.div>

        {/* Right Column: Teachable Machine webcam & pose mapper */}
        <motion.div
          id="right-column-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-12 xl:col-span-4 h-full"
        >
          <TeachableMachineController
            onActionTrigger={handleActionTrigger}
            onActiveActionChange={handleActiveActionChange}
          />
        </motion.div>

      </main>

      {/* Modern Footer */}
      <footer className="border-t border-white/5 bg-neutral-950 px-6 py-6 mt-auto text-neutral-500 text-[11px] flex flex-col md:flex-row items-center justify-between gap-4 font-medium tracking-wide">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Engineered for Ultra-Low Latency Inference &bull; Model Vision</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2"><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-neutral-300 font-sans">SPACE</kbd> Ascent</span>
          <span className="flex items-center gap-2"><kbd className="bg-white/5 px-1.5 py-0.5 rounded border border-white/10 text-neutral-300 font-sans">DOWN</kbd> Descent</span>
        </div>
      </footer>

    </div>
  );
}
