import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Returns true if the current device is iOS (iPhone / iPad).
 * The Fullscreen API is not supported on iOS Safari, so we fall back to a
 * CSS-based simulated fullscreen instead.
 */
function isIOS(): boolean {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    // iPadOS 13+ reports itself as "Macintosh" but supports touch
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

const supportsFullscreen = (): boolean =>
  !isIOS() && typeof document.documentElement.requestFullscreen === "function";

interface UseFullscreenReturn {
  ref: React.RefObject<HTMLDivElement>;
  isFullscreen: boolean;
  toggle: () => void;
}

/**
 * Manages fullscreen for a map wrapper element.
 *
 * On browsers that support the Fullscreen API (desktop, Android) it uses
 * requestFullscreen / exitFullscreen. On iOS Safari — which blocks the API —
 * it falls back to a CSS-based overlay that achieves the same visual result.
 */
export function useFullscreen(): UseFullscreenReturn {
  const ref = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iOSMode = !supportsFullscreen();

  // --- Native Fullscreen API path (non-iOS) ---
  useEffect(() => {
    if (iOSMode) return;
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, [iOSMode]);

  // --- iOS CSS fallback: lock body scroll while simulated fullscreen is on ---
  useEffect(() => {
    if (!iOSMode) return;
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [iOSMode, isFullscreen]);

  const toggle = useCallback(() => {
    if (iOSMode) {
      // CSS-based fallback for iOS
      setIsFullscreen((prev) => !prev);
      return;
    }
    const el = ref.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  }, [iOSMode]);

  return { ref, isFullscreen, toggle };
}
