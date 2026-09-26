"use client";

import { useEffect } from "react";

/**
 * Stops the DOCUMENT from scrolling while a gated app screen is mounted.
 *
 * The app shell is h-dvh, but iOS Safari grows the viewport when the toolbar
 * retracts, so the shell could end up taller than the document's 100% and the
 * page itself scrolled — leaving a dead band of canvas below the tab bar.
 *
 * An earlier attempt made the shell `fixed inset-0` instead. That collapsed the
 * layout on iOS: the shell lost its resolved height, `main` flexed to nothing,
 * and the composer and tab bar ended up stacked at the top of an empty screen.
 * Locking overflow here leaves the shell's layout exactly as it was and only
 * takes away the document's ability to scroll.
 *
 * Restores whatever was there on unmount, so the marketing pages still scroll.
 */
export function ViewportLock() {
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    const prevOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
      body.style.overscrollBehavior = prevOverscroll;
    };
  }, []);

  return null;
}
