"use client";

import React, { useRef, useEffect } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  value,
  onChange,
  disabled = false,
  error = false,
  autoFocus = true,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || "");

  useEffect(() => {
    if (autoFocus && !disabled && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value.replace(/\D/g, "");

    if (!inputValue) {
      // Clear current digit
      const next = digits.slice();
      next[index] = "";
      onChange(next.join(""));
      return;
    }

    if (inputValue.length === 1) {
      const next = digits.slice();
      next[index] = inputValue;
      const combined = next.join("");
      onChange(combined);

      // Auto-focus next field
      if (index < 5 && inputsRef.current[index + 1]) {
        inputsRef.current[index + 1]?.focus();
      }
    } else {
      // Handle paste directly into field
      handlePastedDigits(inputValue);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        // Move focus backward if current cell is already empty
        inputsRef.current[index - 1]?.focus();
        const next = digits.slice();
        next[index - 1] = "";
        onChange(next.join(""));
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasteData) {
      handlePastedDigits(pasteData);
    }
  };

  const handlePastedDigits = (pasted: string) => {
    const sanitized = pasted.slice(0, 6);
    onChange(sanitized);

    // Focus the box following the last pasted character
    const targetIndex = Math.min(sanitized.length, 5);
    inputsRef.current[targetIndex]?.focus();
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d*"
          maxLength={1}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          aria-label={`Digit ${idx + 1} of 6`}
          className={`w-11 h-12 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-lg border transition-colors focus:outline-none focus:ring-2 ${
            error
              ? "border-red-500 text-red-600 bg-red-50/50 dark:bg-red-950/20 focus:ring-red-500"
              : "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:border-zinc-900 dark:focus:border-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-100"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        />
      ))}
    </div>
  );
}
