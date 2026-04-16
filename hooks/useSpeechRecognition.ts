"use client";

import { useState, useRef, useCallback } from "react";

interface Options {
  onFinalResult: (transcript: string) => void;
  onInterimResult?: (transcript: string) => void;
}

function getSR(): typeof SpeechRecognition | null {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return window.SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export function useSpeechRecognition({ onFinalResult, onInterimResult }: Options) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const accumulatedRef = useRef<string>("");

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      alert("Voice input is not supported in this browser. Please use Safari on iOS or Chrome on Android.");
      return;
    }

    accumulatedRef.current = "";

    const recognition: SpeechRecognition = new SR();
    recognition.continuous = true;      // keep listening until user stops
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          accumulatedRef.current += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      // Show live interim text
      onInterimResult?.(accumulatedRef.current + interim);
    };

    recognition.onend = () => {
      setIsListening(false);
      const final = accumulatedRef.current.trim();
      if (final) onFinalResult(final);
      accumulatedRef.current = "";
    };

    recognition.onerror = (event) => {
      // "aborted" fires when we call stop() manually — not a real error
      if (event.error === "aborted") return;
      setIsListening(false);
      accumulatedRef.current = "";
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onFinalResult, onInterimResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    // onend will fire and trigger onFinalResult
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, toggle };
}
