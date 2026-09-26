"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "./IconButton";

/**
 * Bottom sheet / dialog. Replaces 3 hand-rolled sheets that had no dialog role,
 * no focus trap, no Escape handler, no focus restore, and (in 2 of 3 cases) no
 * max-width, so they spanned an entire desktop monitor.
 *
 * On >=sm it centres as a normal dialog; on mobile it stays a bottom sheet.
 */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusTo = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  const focusables = useCallback(() => {
    if (!panelRef.current) return [] as HTMLElement[];
    return Array.from(
      panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null);
  }, []);

  // Remember what had focus so it can be handed back on close — without this a
  // keyboard user is dumped at the top of the document every time.
  useEffect(() => {
    if (!open) return;
    restoreFocusTo.current = document.activeElement as HTMLElement | null;
    const first = focusables()[0];
    (first ?? panelRef.current)?.focus();
    return () => restoreFocusTo.current?.focus?.();
  }, [open, focusables]);

  // Escape to dismiss, Tab cycled inside the panel.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, focusables]);

  // Stop the page behind the sheet from scrolling.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      {/* Scrim. Clicking it dismisses; keyboard users use Escape, and it is
          aria-hidden so it never shows up as a phantom control. */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "relative flex max-h-[88dvh] w-full flex-col overflow-hidden bg-surface shadow-sheet",
          "rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
        )}
      >
        <div className="flex items-start gap-3 border-b border-border-subtle px-5 pt-5 pb-4 sm:px-6">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-sm text-ink-muted">
                {description}
              </p>
            ) : null}
          </div>
          <IconButton icon="close" label="Close" onClick={onClose} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>

        {footer ? (
          <div className="shrink-0 border-t border-border-subtle px-5 py-4 pb-safe sm:px-6">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
