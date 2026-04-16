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

  const start = useCallback(() => {
    const SR = getSR();
    if (!SR) {
      alert("Voice input is not supported in this browser. Please use Safari on iOS or Chrome on Android.");
      return;
    }

    const recognition: SpeechRecognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      if (interim) onInterimResult?.(interim);
      if (final) onFinalResult(final.trim());
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [onFinalResult, onInterimResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const toggle = useCallback(() => {
    if (isListening) stop();
    else start();
  }, [isListening, start, stop]);

  return { isListening, toggle };
}
