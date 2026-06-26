"use client";

import { useState } from "react";

// Shows your custom icon from /public/wave.png if present; otherwise falls back
// to the built-in SVG so the dashboard never shows a broken image.
//
// To use your own icon: drop a file named exactly `wave.png` into the project's
// `public/` folder (PNG, ideally square, e.g. 128×128). It will appear here.
export default function WaveIcon({ className = "h-8 w-8" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/wave.png"
        alt="wave"
        className={`${className} object-contain`}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback: built-in waving-hand SVG.
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <g fill="#fcdaccff" stroke="#1f2937" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 250 L96 120 a24 24 0 0 1 47 -9 l20 110 q60 -10 110 40 l60 -78 a26 26 0 0 1 44 26 l-40 150 q-10 70 -70 100 l8 70 a8 8 0 0 1 -8 9 H214 a8 8 0 0 1 -8 -8 l-6 -64 q-66 -38 -80 -120 z" />
        <path fill="none" d="M150 230 L126 120" />
        <path fill="none" d="M200 220 L184 100" />
        <path fill="none" d="M250 222 L242 104" />
        <path fill="none" d="M298 250 L300 150" />
      </g>
      <g fill="none" stroke="#1f2937" strokeWidth="16" strokeLinecap="round">
        <path d="M388 96 q40 -16 80 4" />
        <path d="M396 150 q40 -10 70 22" />
        <path d="M70 196 q-30 24 -38 60" />
        <path d="M104 220 q-26 22 -32 54" />
      </g>
    </svg>
  );
}
