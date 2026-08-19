"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity } from "lucide-react";

interface AIAvatarProps {
  isSpeaking: boolean;
  avatarMode: "hologram" | "photo";
}

export function AIAvatar({ isSpeaking, avatarMode }: AIAvatarProps) {
  // SVG mouth morphing paths:
  // Closed smile (idle)
  const mouthClosed = "M 90 120 C 95 120, 105 120, 110 120 C 105 120, 95 120, 90 120";
  // Various speaking mouth shapes
  const mouthShape1 = "M 90 120 C 93 127, 107 127, 110 120 C 107 113, 93 113, 90 120";
  const mouthShape2 = "M 93 120 C 95 128, 105 128, 107 120 C 105 111, 95 111, 93 120";
  const mouthShape3 = "M 88 120 C 92 131, 108 131, 112 120 C 108 109, 92 109, 88 120";
  const mouthShape4 = "M 89 120 C 93 125, 107 125, 111 120 C 107 115, 93 115, 89 120";

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {avatarMode === "hologram" ? (
        // HOLOGRAM AVATAR (Interactive Speaking SVG)
        <div className="relative w-64 h-64 md:w-72 md:h-72 flex items-center justify-center">
          {/* Outer Hologram Rotating Rings */}
          <motion.div
            className="absolute inset-0 rounded-full border border-dashed border-blue-500/20"
            animate={{ rotate: 360 }}
            transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-double border-purple-500/15"
            animate={{ rotate: -360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />

          {/* AI Status Scanning Line */}
          {isSpeaking && (
            <motion.div
              className="absolute left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-blue-500 to-transparent z-25 opacity-40"
              animate={{ top: ["15%", "85%", "15%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />
          )}

          {/* Glowing Ambient Background Ring */}
          <motion.div
            className="absolute inset-6 rounded-full bg-gradient-to-br from-blue-600/10 to-purple-600/10 blur-xl"
            animate={isSpeaking ? { scale: [1, 1.08, 1] } : { scale: 1 }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Avatar Container */}
          <div className="relative w-52 h-52 md:w-60 md:h-60 rounded-full bg-gradient-to-b from-slate-900 to-blue-950/80 border border-blue-500/30 overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.2)]">
            {/* High-Tech Grid Pattern in Background */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:10px_10px] opacity-40" />

            <svg
              viewBox="0 0 200 200"
              className="w-full h-full select-none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradients */}
                <linearGradient id="faceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#0369a1" />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </linearGradient>
                <linearGradient id="jacketGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="hologramGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
                
                {/* Glowing Filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Entire Recruiter Group (subtle breathing animation) */}
              <motion.g
                animate={{
                  y: isSpeaking ? [0, -2, 0, -1, 0] : [0, -1.5, 0],
                  rotate: isSpeaking ? [0, 0.4, -0.4, 0] : [0, 0.2, 0],
                }}
                transition={{
                  duration: isSpeaking ? 3.5 : 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {/* Back Hair */}
                <path
                  d="M 60 90 C 60 140, 140 140, 140 90 C 140 45, 60 45, 60 90"
                  fill="url(#hairGrad)"
                  opacity="0.3"
                />

                {/* Neck */}
                <rect
                  x="92"
                  y="125"
                  width="16"
                  height="28"
                  rx="4"
                  fill="url(#skinGrad)"
                  stroke="#0ea5e9"
                  strokeWidth="0.8"
                  opacity="0.65"
                />

                {/* Suit Shoulders & Jacket (Professional Outfit) */}
                <path
                  d="M 55 152 C 35 170, 32 195, 32 200 L 168 200 C 168 195, 165 170, 145 152 C 132 142, 114 148, 100 148 C 86 148, 68 142, 55 152"
                  fill="url(#jacketGrad)"
                  stroke="#3b82f6"
                  strokeWidth="1.2"
                  strokeOpacity="0.6"
                />

                {/* Inner Blouse / V-Neck */}
                <path
                  d="M 90 148 L 100 166 L 110 148 Z"
                  fill="#0c4a6e"
                  stroke="#0284c7"
                  strokeWidth="0.8"
                />

                {/* Face Base */}
                <path
                  d="M 70 85 C 70 122, 85 142, 100 142 C 115 142, 130 122, 130 85 C 130 60, 70 60, 70 85"
                  fill="url(#skinGrad)"
                  stroke="#38bdf8"
                  strokeWidth="1.5"
                  filter="drop-shadow(0px 0px 8px rgba(56, 189, 248, 0.25))"
                />

                {/* Sleek Glasses (Professional recruiter look) */}
                <g stroke="#38bdf8" strokeWidth="1.5" fill="none" opacity="0.9">
                  {/* Left lens frame */}
                  <rect x="76" y="80" width="18" height="12" rx="3" fill="rgba(56,189,248,0.08)" />
                  {/* Right lens frame */}
                  <rect x="106" y="80" width="18" height="12" rx="3" fill="rgba(56,189,248,0.08)" />
                  {/* Bridge */}
                  <path d="M 94 85 L 106 85" />
                  {/* Sides */}
                  <path d="M 70 84 L 76 84" />
                  <path d="M 124 84 L 130 84" />
                </g>

                {/* Eyes & Blinking Animation */}
                {/* Left Eye */}
                <g transform="translate(85, 86)">
                  <motion.ellipse
                    cx="0"
                    cy="0"
                    rx="3"
                    ry="3"
                    fill="#38bdf8"
                    animate={{ scaleY: [1, 1, 1, 0.1, 1, 1, 1] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      ease: "easeInOut",
                    }}
                  />
                  <circle cx="-1" cy="-1" r="0.8" fill="#ffffff" />
                </g>

                {/* Right Eye */}
                <g transform="translate(115, 86)">
                  <motion.ellipse
                    cx="0"
                    cy="0"
                    rx="3"
                    ry="3"
                    fill="#38bdf8"
                    animate={{ scaleY: [1, 1, 1, 0.1, 1, 1, 1] }}
                    transition={{
                      duration: 4,
                      repeat: Infinity,
                      repeatDelay: 1.5,
                      ease: "easeInOut",
                    }}
                  />
                  <circle cx="-1" cy="-1" r="0.8" fill="#ffffff" />
                </g>

                {/* Eyebrows (React to speech slightly) */}
                <motion.path
                  d="M 78 77 Q 85 75 91 78"
                  stroke="#0ea5e9"
                  strokeWidth="1.2"
                  fill="none"
                  animate={isSpeaking ? { y: [-0.5, 0.5, -0.5] } : { y: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.path
                  d="M 109 78 Q 115 75 122 77"
                  stroke="#0ea5e9"
                  strokeWidth="1.2"
                  fill="none"
                  animate={isSpeaking ? { y: [-0.5, 0.5, -0.5] } : { y: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />

                {/* Nose Shadow line */}
                <path d="M 100 93 L 98 103 L 102 103" stroke="#0ea5e9" strokeWidth="0.8" fill="none" opacity="0.7" />

                {/* Mouth Morphing (Speaking Lip Sync) */}
                <motion.path
                  animate={{
                    d: isSpeaking
                      ? [mouthClosed, mouthShape1, mouthShape2, mouthShape3, mouthShape4, mouthClosed]
                      : mouthClosed,
                  }}
                  transition={
                    isSpeaking
                      ? {
                          duration: 0.8,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      : { duration: 0.2 }
                  }
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  filter="drop-shadow(0px 0px 4px rgba(56, 189, 248, 0.6))"
                />

                {/* Front Hair (Sleek professional cut) */}
                <path
                  d="M 68 80 C 80 52, 120 52, 132 80 C 122 66, 78 66, 68 80"
                  fill="url(#hairGrad)"
                  stroke="#0284c7"
                  strokeWidth="0.5"
                />

                {/* Holographic Ear Set / Recruiter Headset */}
                {/* Ear clamp */}
                <rect
                  x="67"
                  y="80"
                  width="4"
                  height="12"
                  rx="1"
                  fill="#0ea5e9"
                  opacity="0.8"
                />
                {/* Thin boom mic arm pointing to the mouth */}
                <path
                  d="M 69 86 Q 66 116, 88 122"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  opacity="0.8"
                />
                {/* Microphone glowing tip */}
                <motion.circle
                  cx="88"
                  cy="122"
                  r="2.5"
                  fill={isSpeaking ? "#10b981" : "#38bdf8"}
                  animate={
                    isSpeaking
                      ? { scale: [1, 1.4, 1], filter: "drop-shadow(0px 0px 6px #10b981)" }
                      : { scale: 1 }
                  }
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </motion.g>

              {/* Data Floating Elements (Simulated AI processing) */}
              {isSpeaking && (
                <g fill="#0ea5e9" fontSize="6" opacity="0.6">
                  {/* Digital Telemetry values */}
                  <text x="35" y="45">EVAL_MODE: ACTIVE</text>
                  <text x="35" y="55">NLP_STREAM: SYNC</text>
                  <text x="135" y="45">PTS: 0.982</text>
                  <text x="135" y="55">AQ: 95%</text>
                </g>
              )}
            </svg>

            {/* Glowing Corner HUD indicators */}
            <div className="absolute top-2 left-2 flex gap-1">
              <span className="w-1 h-1 rounded-full bg-blue-500 animate-ping" />
              <span className="text-[7px] text-blue-400 font-mono tracking-widest">LIVE</span>
            </div>
            <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded border border-white/5">
              <Activity className="w-2.5 h-2.5 text-purple-400 animate-pulse" />
              <span className="text-[7px] text-purple-400 font-mono">NEURAL_V4</span>
            </div>
          </div>
        </div>
      ) : (
        // PHOTO MODE (Static Image with Advanced Audio reactive ripples)
        <div className="relative w-52 h-52 md:w-60 md:h-60 rounded-full flex items-center justify-center">
          {/* Pulsing Ripple rings when AI is speaking */}
          <AnimatePresence>
            {isSpeaking && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-blue-500/40"
                  initial={{ opacity: 0.6, scale: 0.95 }}
                  animate={{ opacity: 0, scale: 1.25 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full border border-purple-500/30"
                  initial={{ opacity: 0.5, scale: 0.95 }}
                  animate={{ opacity: 0, scale: 1.4 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay: 0.4 }}
                />
                <motion.div
                  className="absolute -inset-4 rounded-full border border-dashed border-blue-400/20"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                />
              </>
            )}
          </AnimatePresence>

          {/* Photo Frame Container */}
          <div className="relative w-full h-full rounded-full border-2 border-blue-500/20 bg-gray-900 overflow-hidden shadow-[0_0_25px_rgba(59,130,246,0.15)] transition-all duration-300">
            {/* The recruiter photo */}
            <img
              src="/ai_interviewer_avatar.jpg"
              alt="AI Recruiter"
              className="h-full w-full object-cover transition-all duration-500"
              style={{
                filter: isSpeaking
                  ? "brightness(1.06) contrast(1.02) saturate(1.05) drop-shadow(0 0 8px rgba(59,130,246,0.2))"
                  : "brightness(0.9) contrast(0.98)",
              }}
            />

            {/* Glowing ring overlay on photo boundary */}
            {isSpeaking && (
              <motion.div
                className="absolute inset-0 border-4 border-blue-500/60 rounded-full shadow-[inset_0_0_15px_rgba(59,130,246,0.4)]"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}

            {/* Sleek scanlines filter */}
            <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,3px_100%] opacity-15" />
          </div>
        </div>
      )}
    </div>
  );
}
