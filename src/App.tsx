/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { motion } from "motion/react";
import { ControlAction } from "./types";
import GameCanvas from "./components/GameCanvas";
import TeachableMachineController from "./components/TeachableMachineController";
import { Sparkles } from "lucide-react";

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
    setActiveState(action);
  };

  const handleManualCrouchRelease = () => {
    setActiveState(ControlAction.RUN);
  };

  const handleRestart = () => {
    setTotalResets(prev => prev + 1);
  };

  return (
    <div id="main-app-container" className="h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans selection:bg-cyan-500/30 overflow-hidden antialiased">


      {/* Main Container Layout */}
      <main className="flex-1 w-full flex flex-row items-center justify-between p-4 md:p-8 gap-8 overflow-hidden max-w-[1600px] mx-auto">
        
        {/* Full Screen Gameplay Canvas */}
        <motion.div
          id="game-container"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 min-w-0 relative h-full flex flex-col justify-center"
        >
          <div className="w-full">
            <GameCanvas
              activeState={activeState}
              jumpPulse={jumpPulse}
              onRestart={handleRestart}
            />
          </div>
        </motion.div>

        {/* Static Right Column: Teachable Machine webcam & pose mapper */}
        <motion.div
          id="right-column-container"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="w-80 flex-shrink-0 flex flex-col h-full justify-center"
        >
          <TeachableMachineController
            onActionTrigger={handleActionTrigger}
            onActiveActionChange={handleActiveActionChange}
          />
        </motion.div>

      </main>

      {/* Modern Footer */}
      <footer className="border-t border-white/5 bg-neutral-950 px-6 py-4 mt-auto text-neutral-500 text-[11px] flex flex-col md:flex-row items-center justify-between gap-4 font-medium tracking-wide">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          <span>Face-Controlled Neural Runner &bull; Teachable Machine Vision</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2">☝️ <span className="text-cyan-400">1Finger</span> = Jump</span>
          <span className="flex items-center gap-2">✋ <span className="text-emerald-400">Hi-Five</span> = Run</span>
          <span className="flex items-center gap-2">🧍 <span className="text-neutral-400">Idle Left</span> = Stop</span>
        </div>
      </footer>

    </div>
  );
}
