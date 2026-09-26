"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";

/**
 * The voice-first message composer: a centred mic FAB with a keyboard toggle and
 * an optional camera button.
 *
 * Extracted from two near-verbatim copies (onboarding and ChatInterface) that had
 * already drifted apart — different max-widths, and the photo button existed in
 * only one of them. This is the highest-value dedupe in the repo.
 */
export function Composer({
  value,
  onChange,
  onSubmit,
  isLoading = false,
  isListening = false,
  interimText,
  onToggleMic,
  onPickImage,
  placeholder = "Type here…",
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isLoading?: boolean;
  isListening?: boolean;
  interimText?: string;
  onToggleMic: () => void;
  onPickImage?: (file: File) => void;
  placeholder?: string;
}) {
  const [showInput, setShowInput] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showInput) textareaRef.current?.focus();
  }, [showInput]);

  function submit() {
    if (!value.trim() || isLoading) return;
    onSubmit();
    setShowInput(false);
  }

  function autosize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
  }

  return (
    <div className="border-t border-border-subtle bg-surface px-4 pt-2 pb-safe">
      {/* Live region so a screen reader hears that dictation started and what
          was heard — previously neither was announced at all. */}
      <div aria-live="polite" className="min-h-0">
        {isListening ? (
          <p className="mb-2 flex items-center justify-center gap-2 text-sm">
            <span className="font-medium text-danger">Listening…</span>
            {interimText ? (
              <span className="max-w-[220px] truncate italic text-ink-muted">
                &ldquo;{interimText}&rdquo;
              </span>
            ) : null}
          </p>
        ) : null}
      </div>

      {showInput ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mx-auto mb-2 flex max-w-3xl items-end gap-2"
        >
          <label htmlFor="composer-input" className="sr-only">
            Message your coach
          </label>
          <textarea
            id="composer-input"
            ref={textareaRef}
            rows={1}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onInput={(e) => autosize(e.currentTarget)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={placeholder}
            className="max-h-32 min-h-12 flex-1 resize-none overflow-y-auto rounded-2xl border border-border-strong bg-surface px-4 py-3 text-base text-ink placeholder:text-ink-muted/70"
          />
          {value.trim() ? (
            <button
              type="submit"
              disabled={isLoading}
              aria-label="Send message"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              <Icon name="send" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowInput(false)}
              aria-label="Close keyboard"
              className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface-sunken text-ink-muted transition-colors hover:text-ink"
            >
              <Icon name="close" />
            </button>
          )}
        </form>
      ) : null}

      <div className="flex items-center justify-center gap-6 py-2">
        <button
          type="button"
          onClick={() => setShowInput((v) => !v)}
          disabled={isLoading}
          aria-label="Type a message"
          aria-expanded={showInput}
          aria-controls="composer-input"
          className={cn(
            "flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-40",
            showInput
              ? "bg-brand-50 text-brand-700"
              : "bg-surface-sunken text-ink-muted hover:text-ink"
          )}
        >
          <Icon name="menu" />
        </button>

        <button
          type="button"
          onClick={onToggleMic}
          disabled={isLoading}
          aria-label={isListening ? "Stop voice input" : "Start voice input"}
          aria-pressed={isListening}
          className={cn(
            "relative flex size-16 items-center justify-center rounded-full text-white shadow-cta",
            "transition-transform duration-200 active:scale-95 disabled:opacity-40",
            isListening ? "bg-danger" : "bg-brand-600 hover:bg-brand-700"
          )}
        >
          {isListening ? (
            <span
              aria-hidden="true"
              className="absolute inset-0 animate-ping rounded-full bg-danger opacity-40"
            />
          ) : null}
          <Icon name="mic" size={26} />
        </button>

        {onPickImage ? (
          <>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={isLoading}
              aria-label="Snap a nutrition label"
              className="flex size-11 items-center justify-center rounded-full bg-surface-sunken text-ink-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              <Icon name="camera" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onPickImage(file);
                e.target.value = "";
              }}
            />
          </>
        ) : (
          // Keeps the mic optically centred when there is no camera button.
          <span aria-hidden="true" className="size-11" />
        )}
      </div>
    </div>
  );
}
