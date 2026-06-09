"use client";

import { useEffect, useState } from "react";

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setSupported(!!document.documentElement.requestFullscreen);
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  if (!supported) return null;

  const toggle = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Navegador bloqueou (gesto, iframe sem allow). Silencioso.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFullscreen ? "Sair do fullscreen" : "Entrar em fullscreen"}
      title={isFullscreen ? "Sair do fullscreen" : "Fullscreen"}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-sky-200/80 transition hover:bg-white/10 hover:text-white"
    >
      {isFullscreen ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8V3h5" /><path d="M21 8V3h-5" /><path d="M3 16v5h5" /><path d="M21 16v5h-5" />
        </svg>
      )}
    </button>
  );
}
