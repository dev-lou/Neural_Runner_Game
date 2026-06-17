import { useState, useEffect, useRef } from "react";
import { Camera, RefreshCw, AlertTriangle, Play, Pause, Settings, Sliders, CheckCircle2 } from "lucide-react";
import { ControlAction, TMClassPrediction, TMModelStatus } from "../types";

// Types for Teachable Machine CDN objects
declare global {
  interface Window {
    tf?: any;
    tmImage?: any;
  }
}

interface TMControllerProps {
  onActionTrigger: (action: ControlAction) => void;
  onActiveActionChange: (action: ControlAction) => void;
}

export default function TeachableMachineController({
  onActionTrigger,
  onActiveActionChange,
}: TMControllerProps) {
  // Model URL & States
  const [modelUrl, setModelUrl] = useState<string>(
    "https://teachablemachine.withgoogle.com/models/p_r_o_p_e_r_t_y_i_d/" // Placeholder or base template tutorial URL
  );
  const [scriptsLoaded, setScriptsLoaded] = useState<boolean>(false);
  const [scriptsError, setScriptsError] = useState<string | null>(null);
  const [modelStatus, setModelStatus] = useState<TMModelStatus>("IDLE");
  const [classes, setClasses] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, ControlAction>>({});
  const [predictions, setPredictions] = useState<TMClassPrediction[]>([]);
  const [threshold, setThreshold] = useState<number>(0.85);
  const [activeAction, setActiveAction] = useState<ControlAction>(ControlAction.RUN);

  // Webcam States
  const [webcamEnabled, setWebcamEnabled] = useState<boolean>(false);
  const [cameraPermission, setCameraPermission] = useState<"granted" | "denied" | "prompt">("prompt");
  const [webcamLoading, setWebcamLoading] = useState<boolean>(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const predictionLoopRef = useRef<number | null>(null);

  // 1. Load TensorFlow and Teachable Machine SDK from CDN
  useEffect(() => {
    let tfScript: HTMLScriptElement | null = null;
    let tmScript: HTMLScriptElement | null = null;

    const loadScripts = async () => {
      try {
        if (window.tf && window.tmImage) {
          setScriptsLoaded(true);
          return;
        }

        // Load TensorFlow.js
        tfScript = document.createElement("script");
        tfScript.src = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.17.0/dist/tf.min.js";
        tfScript.async = true;
        
        await new Promise((resolve, reject) => {
          if (!tfScript) return reject();
          tfScript.onload = resolve;
          tfScript.onerror = () => reject(new Error("Failed to load TensorFlow.js from CDN"));
          document.head.appendChild(tfScript);
        });

        // Load Teachable Machine Image SDK
        tmScript = document.createElement("script");
        tmScript.src = "https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8.5/dist/teachablemachine-image.min.js";
        tmScript.async = true;

        await new Promise((resolve, reject) => {
          if (!tmScript) return reject();
          tmScript.onload = resolve;
          tmScript.onerror = () => reject(new Error("Failed to load Teachable Machine SDK"));
          document.head.appendChild(tmScript);
        });

        if (window.tf && window.tmImage) {
          setScriptsLoaded(true);
        } else {
          throw new Error("SDK loading completed but structures undefined");
        }
      } catch (err: any) {
        setScriptsError(err?.message || "An error occurred while booting model environment");
      }
    };

    loadScripts();

    return () => {
      // Keep scripts loaded globally to avoid reload overhead, but cleanup if needed
    };
  }, []);

  // 2. Load Model URL
  const loadModel = async (urlStr: string) => {
    if (!scriptsLoaded) return;
    
    // Clean URL
    let u = urlStr.trim();
    if (!u.endsWith("/")) u += "/";

    setModelStatus("LOADING");
    setPredictions([]);

    try {
      const modelJsonURL = u + "model.json";
      const metadataJsonURL = u + "metadata.json";

      // Fetch metadata first to extract classes gracefully
      const metaRes = await fetch(metadataJsonURL);
      if (!metaRes.ok) {
        throw new Error("Could not download Teachable Machine metadata. Verify the URL is public and correct.");
      }
      const metadata = await metaRes.json();
      const modelClasses: string[] = metadata.classes || [];
      setClasses(modelClasses);

      // Load model via SDK
      const model = await window.tmImage.load(modelJsonURL, metadataJsonURL);
      modelRef.current = model;

      // Auto-configure standard maps
      const newMappings: Record<string, ControlAction> = {};
      modelClasses.forEach((cls) => {
        const lower = cls.toLowerCase();
        if (lower.includes("jump") || lower.includes("up") || lower.includes("raise") || lower.includes("hands") || lower.includes("happy") || lower.includes("smile")) {
          newMappings[cls] = ControlAction.JUMP;
        } else if (lower.includes("crouch") || lower.includes("duck") || lower.includes("down") || lower.includes("low") || lower.includes("lean") || lower.includes("sad") || lower.includes("frown")) {
          newMappings[cls] = ControlAction.CROUCH;
        } else if (lower.includes("stop") || lower.includes("idle") || lower.includes("pause") || lower.includes("rest") || lower.includes("stand") || lower.includes("nothing") || lower.includes("neutral")) {
          newMappings[cls] = ControlAction.STOP;
        } else if (lower.includes("angry") || lower.includes("mad") || lower.includes("run") || lower.includes("go") || lower.includes("forward")) {
          newMappings[cls] = ControlAction.RUN; 
        } else {
          newMappings[cls] = ControlAction.RUN;
        }
      });
      setMappings(newMappings);
      setModelStatus("READY");
    } catch (err: any) {
      console.error(err);
      setModelStatus("ERROR");
      setScriptsError(err?.message || "Invalid Model URL or network access error.");
    }
  };

  // Switch webcam on/off
  const toggleWebcam = async () => {
    if (webcamEnabled) {
      stopWebcam();
    } else {
      await startWebcam();
    }
  };

  const startWebcam = async () => {
    setWebcamLoading(true);
    try {
      const constraints = {
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraPermission("granted");
      setWebcamEnabled(true);
    } catch (err) {
      console.error("Camera access denied:", err);
      setCameraPermission("denied");
    } finally {
      setWebcamLoading(false);
    }
  };

  const stopWebcam = () => {
    if (predictionLoopRef.current) {
      cancelAnimationFrame(predictionLoopRef.current);
      predictionLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setWebcamEnabled(false);
    setPredictions([]);
    setActiveAction(ControlAction.RUN);
    onActiveActionChange(ControlAction.RUN);
  };

  // Prediction loop
  useEffect(() => {
    if (!webcamEnabled || modelStatus !== "READY" || !modelRef.current || !videoRef.current) {
      if (predictionLoopRef.current) {
        cancelAnimationFrame(predictionLoopRef.current);
        predictionLoopRef.current = null;
      }
      return;
    }

    const predictFrame = async () => {
      if (!videoRef.current || !modelRef.current || !webcamEnabled) return;

      try {
        // Runs prediction on video element
        const predictionList = await modelRef.current.predict(videoRef.current);
        
        // Convert to our state format
        const formatted: TMClassPrediction[] = predictionList.map((p: any) => ({
          className: p.className,
          probability: p.probability,
        }));

        setPredictions(formatted);

        // Find match of highest confidence
        let maxPred = formatted[0];
        for (let i = 1; i < formatted.length; i++) {
          if (formatted[i].probability > maxPred.probability) {
            maxPred = formatted[i];
          }
        }

        // Apply threshold and update game state action
        if (maxPred && maxPred.probability >= threshold) {
          const action = mappings[maxPred.className] || ControlAction.RUN;
          if (action !== activeAction) {
            setActiveAction(action);
            onActiveActionChange(action);

            // Edge Trigger: Only send discrete trigger at the precise onset of JUMP pose
            if (action === ControlAction.JUMP) {
              onActionTrigger(ControlAction.JUMP);
            }
          }

          // CROUCH needs continuous active sensor triggers
          if (action === ControlAction.CROUCH) {
            onActionTrigger(ControlAction.CROUCH);
          }
        } else {
          // Defaults to stand still / STOP if confidence drops below target ratio
          if (activeAction !== ControlAction.STOP) {
            setActiveAction(ControlAction.STOP);
            onActiveActionChange(ControlAction.STOP);
          }
        }
      } catch (e) {
        console.warn("Prediction frame skipped:", e);
      }

      // Restrict rate slightly to prevent CPU overload, requestAnimationFrame standard
      predictionLoopRef.current = requestAnimationFrame(predictFrame);
    };

    predictionLoopRef.current = requestAnimationFrame(predictFrame);

    return () => {
      if (predictionLoopRef.current) {
        cancelAnimationFrame(predictionLoopRef.current);
      }
    };
  }, [webcamEnabled, modelStatus, mappings, threshold, activeAction, onActionTrigger, onActiveActionChange]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (predictionLoopRef.current) {
        cancelAnimationFrame(predictionLoopRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div id="teachable-machine-container" className="flex flex-col bg-neutral-900/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-6 shadow-2xl h-full select-none text-neutral-200 font-sans relative overflow-hidden">
      
      {/* Background glow */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Title Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/5 border border-white/10">
            <Settings className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-xs uppercase tracking-[0.2em] font-medium text-white">NEURAL SENSOR</h2>
        </div>
        <div className="flex items-center gap-2 bg-neutral-950 px-3 py-1.5 rounded-full border border-white/5">
          <span className={`inline-block w-2.5 h-2.5 rounded-full ${
            modelStatus === "READY" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse" :
            modelStatus === "LOADING" ? "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)] animate-pulse" :
            modelStatus === "ERROR" ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" : "bg-neutral-600"
          }`} />
          <span className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">
            {modelStatus === "READY" ? "ONLINE" :
             modelStatus === "LOADING" ? "BOOTING" :
             modelStatus === "ERROR" ? "ERROR" : "OFFLINE"}
          </span>
        </div>
      </div>

      {/* Script Status Check */}
      {!scriptsLoaded && !scriptsError && (
        <div className="flex flex-col items-center justify-center py-8 text-center text-cyan-400 relative z-10">
          <RefreshCw className="w-8 h-8 animate-spin mb-4 opacity-50" />
          <p className="text-[10px] tracking-widest font-medium">INITIALIZING TENSORFLOW ENGINE</p>
        </div>
      )}

      {scriptsError && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 mb-6 text-xs flex gap-3 items-start relative z-10">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-rose-400 font-bold mb-1 tracking-wide">SYSTEM EXCEPTION</p>
            <p className="text-rose-400/80 mb-3">{scriptsError}</p>
            <button
              onClick={() => { setScriptsError(null); loadModel(modelUrl); }}
              className="text-[10px] uppercase font-bold tracking-wider text-white bg-rose-500 hover:bg-rose-400 px-4 py-2 rounded-lg transition-colors"
            >
              REINITIALIZE
            </button>
          </div>
        </div>
      )}

      {/* Model URL Loader Form */}
      <div className="flex flex-col gap-3 mb-6 relative z-10">
        <label className="text-[10px] uppercase font-bold tracking-widest text-neutral-500">REMOTE ENDPOINT URL</label>
        <div className="flex gap-2">
          <input
            id="tm-model-url-input"
            type="text"
            className="flex-1 bg-neutral-950/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50 focus:shadow-[0_0_15px_rgba(34,211,238,0.1)] transition-all font-mono"
            placeholder="https://teachablemachine.../model"
            value={modelUrl}
            onChange={(e) => setModelUrl(e.target.value)}
          />
          <button
            id="tm-load-model-btn"
            onClick={() => loadModel(modelUrl)}
            disabled={!scriptsLoaded || modelStatus === "LOADING"}
            className="bg-white hover:bg-neutral-200 text-neutral-950 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:border-white/5 border border-transparent rounded-xl text-xs uppercase px-5 py-2.5 font-bold tracking-wider transition-all disabled:opacity-50"
          >
            {modelStatus === "LOADING" ? "..." : "BIND"}
          </button>
        </div>
      </div>

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 min-h-[220px] relative z-10">
        
        {/* Camera Feed Viewport */}
        <div className="relative bg-neutral-950 border border-white/10 rounded-2xl flex flex-col items-center justify-center text-center overflow-hidden h-[180px] md:h-full group shadow-inner">
          {webcamEnabled ? (
            <video
              id="tm-webcam-video"
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1] opacity-80 mix-blend-screen" // mirrored + tech overlay look
            />
          ) : (
            <div className="p-4 flex flex-col items-center gap-3">
              <Camera className="w-8 h-8 text-neutral-700" />
              <div className="text-[10px] text-neutral-500 font-medium tracking-wide">
                {cameraPermission === "denied" ? (
                  <span className="text-rose-400">ACCESS DENIED</span>
                ) : (
                  <span>SENSOR OFFLINE</span>
                )}
              </div>
            </div>
          )}

          {/* Quick Camera Overlay State Controls */}
          {modelStatus === "READY" && (
            <div className="absolute inset-0 bg-neutral-950/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity gap-3">
              <button
                id="tm-toggle-webcam-btn"
                onClick={toggleWebcam}
                disabled={webcamLoading}
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full border border-white/20 transition-transform active:scale-95 shadow-xl backdrop-blur-md"
              >
                {webcamEnabled ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
              </button>
            </div>
          )}

          {/* Prompt banner to start camera */}
          {modelStatus === "READY" && !webcamEnabled && (
            <div className="absolute bottom-3 left-3 right-3 bg-neutral-900/90 backdrop-blur-md border border-white/10 rounded-lg p-2 flex items-center justify-between text-[10px]">
              <span className="text-neutral-300 font-medium tracking-wide ml-2">ACTIVATE SENSOR</span>
              <button
                onClick={startWebcam}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded text-[9px] font-bold tracking-wider"
              >
                START
              </button>
            </div>
          )}
        </div>

        {/* Prediction Results & Controls Mapper */}
        <div className="flex flex-col gap-4 justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase font-bold tracking-widest text-neutral-500 flex items-center gap-2">
                <Sliders className="w-3 h-3 text-cyan-400" /> CONFIDENCE MIN
              </span>
              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded border border-cyan-400/20">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>
            <input
              id="tm-threshold-slider"
              type="range"
              min="0.5"
              max="0.98"
              step="0.05"
              value={threshold}
              onChange={(e) => setThreshold(parseFloat(e.target.value))}
              className="w-full h-1 bg-neutral-800 rounded-full appearance-none cursor-pointer accent-cyan-400 mb-2"
            />
          </div>

          <div className="flex-1 overflow-y-auto max-h-[160px] pr-2 space-y-2 select-none">
            {modelStatus !== "READY" ? (
              <div className="h-full flex flex-col items-center justify-center p-4 text-center border border-dashed border-white/10 bg-neutral-950/30 rounded-xl">
                <p className="text-[10px] text-neutral-500 tracking-wide leading-relaxed">
                  MODEL NOT BOUND.
                </p>
              </div>
            ) : (
              classes.map((cls) => {
                const mapTo = mappings[cls] || ControlAction.RUN;
                const pred = predictions.find((p) => p.className === cls);
                const prob = pred ? pred.probability : 0;
                const isTriggered = prob >= threshold;

                return (
                  <div
                    key={cls}
                    className={`p-3 rounded-xl transition-colors border ${
                      isTriggered
                        ? "bg-cyan-500/10 border-cyan-500/30 shadow-[0_4px_20px_rgba(34,211,238,0.1)]"
                        : "bg-neutral-950 border-white/5 opacity-60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {isTriggered ? (
                          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
                        )}
                        <span className={`text-[11px] font-semibold tracking-wider truncate ${isTriggered ? "text-cyan-50" : "text-neutral-400"}`} title={cls}>
                          {cls}
                        </span>
                      </div>
                      
                      {/* Mapping Select dropdown */}
                      <select
                        onChange={(e) => {
                          const val = e.target.value as ControlAction;
                          setMappings({ ...mappings, [cls]: val });
                        }}
                        value={mapTo}
                        className="bg-neutral-900 border border-white/10 rounded-md text-[9px] px-2 py-1 text-white outline-none cursor-pointer font-bold shrink-0 focus:border-cyan-500/50"
                      >
                        <option value={ControlAction.RUN}>MOTION</option>
                        <option value={ControlAction.JUMP}>ASCEND</option>
                        <option value={ControlAction.CROUCH}>DESCEND</option>
                        <option value={ControlAction.STOP}>IDLE</option>
                      </select>
                    </div>

                    {/* Confidence percentage bar */}
                    <div className="w-full bg-neutral-900 rounded-full h-1 overflow-hidden flex">
                      <div
                        className={`h-full transition-all duration-100 ease-out ${
                          isTriggered ? "bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]" : "bg-neutral-600"
                        }`}
                        style={{ width: `${(prob * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      // Header mapping section
      {/* Model Sandbox Quick Tutorial Help */}
      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
        <span className="text-[10px] text-neutral-500 font-medium tracking-wide">ACTIVE VISION STATE:</span>
        <span className={`text-[10px] px-3 py-1.5 font-bold tracking-[0.15em] rounded-full flex items-center gap-2 border ${
          activeAction === ControlAction.JUMP ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" :
          activeAction === ControlAction.CROUCH ? "bg-violet-500/10 border-violet-500/30 text-violet-400" :
          activeAction === ControlAction.STOP ? "bg-rose-500/10 border-rose-500/30 text-rose-400" :
          "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
        }`}>
          {activeAction === ControlAction.JUMP && <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />}
          {activeAction === ControlAction.CROUCH && <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />}
          {activeAction === ControlAction.STOP && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />}
          {activeAction === ControlAction.RUN && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
          {activeAction === ControlAction.JUMP ? "ASCEND" :
           activeAction === ControlAction.CROUCH ? "DESCEND" :
           activeAction === ControlAction.STOP ? "IDLE / STOP" :
           "KINETIC MOTION"}
        </span>
      </div>

    </div>
  );
}
