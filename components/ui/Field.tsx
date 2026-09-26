"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/**
 * Labelled form controls. Every one of the 7 inputs in the app was
 * programmatically unlabelled — 6 <label> elements existed but none had htmlFor
 * and none wrapped their input, and no input had an id. Wiring the association
 * here makes it impossible to forget.
 */
const CONTROL =
  "w-full rounded-2xl border border-border-strong bg-surface px-4 py-3 text-base text-ink " +
  "placeholder:text-ink-muted/70 focus:border-brand-600 " +
  // 16px minimum so iOS doesn't zoom the viewport on focus.
  "min-h-11";

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: (props: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy =
    [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-ink-body"
      >
        {label}
      </label>
      {children({
        id,
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && !error ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      {/* role=alert so a validation failure is announced, not just coloured. */}
      {error ? (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(CONTROL, className)} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea {...props} className={cn(CONTROL, "resize-none", className)} />
  );
}
