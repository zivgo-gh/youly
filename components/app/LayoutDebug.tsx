"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Opt-in layout diagnostic: append ?debug=1 to any /app URL.
 *
 * Exists because the dead scroll band below the tab bar is only reproducible on a
 * real device, and I have no way to inspect one. Five attempts to fix it blind
 * all shipped to production and all broke the chat screen. This reports facts
 * instead: how tall the document actually is, and WHICH element is making it so.
 *
 * Measured on demand and on an interval, because the bug is cumulative — the
 * document grows with each day-navigation rather than being wrong on first paint.
 */
type Row = { label: string; value: string };

function describe(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const cls = (el.getAttribute("class") ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4)
    .join(".");
  return cls ? `${tag}.${cls}` : tag;
}

export function LayoutDebug() {
  const [on, setOn] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [tall, setTall] = useState<string[]>([]);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setOn(new URLSearchParams(window.location.search).get("debug") === "1")
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const measure = useCallback(() => {
    const doc = document.documentElement;
    const body = document.body;
    const vh = window.innerHeight;
    const docH = Math.max(body.scrollHeight, doc.scrollHeight);

    setRows([
      { label: "innerHeight", value: `${vh}` },
      { label: "body.scrollHeight", value: `${body.scrollHeight}` },
      { label: "html.scrollHeight", value: `${doc.scrollHeight}` },
      { label: "overflow", value: `${docH - vh}px  (${(docH / vh).toFixed(1)}x)` },
      { label: "scrollY", value: `${Math.round(window.scrollY)}` },
      { label: "body overflow", value: getComputedStyle(body).overflow },
    ]);

    // The tallest elements in the document, which is what actually identifies
    // the offender — a name beats another theory.
    const all = Array.from(document.body.querySelectorAll<HTMLElement>("*"));
    const sized = all
      .map((el) => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return {
          el,
          h: Math.round(r.height),
          pos: cs.position,
          oy: cs.overflowY,
        };
      })
      .filter((x) => x.h > vh * 0.9)
      .sort((a, b) => b.h - a.h)
      .slice(0, 6);

    setTall(
      sized.map(
        (x) => `${x.h}px  ${x.pos}/${x.oy}  ${describe(x.el).slice(0, 64)}`
      )
    );
  }, []);

  useEffect(() => {
    if (!on) return;
    const raf = requestAnimationFrame(measure);
    const t = setInterval(measure, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(t);
    };
  }, [on, measure]);

  if (!on) return null;

  return (
    <div className="fixed left-2 right-2 top-2 z-[9999] rounded-xl bg-black/85 p-2 font-mono text-[10px] leading-tight text-white">
      <div className="mb-1 flex items-center justify-between">
        <strong>layout debug</strong>
        <button type="button" onClick={measure} className="underline">
          re-measure
        </button>
      </div>
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-2">
          <span className="opacity-70">{r.label}</span>
          <span>{r.value}</span>
        </div>
      ))}
      <div className="mt-1 opacity-70">tallest elements (&gt; 0.9 viewport):</div>
      {tall.length === 0 ? (
        <div>none</div>
      ) : (
        tall.map((t, i) => (
          <div key={i} className="truncate">
            {t}
          </div>
        ))
      )}
    </div>
  );
}
