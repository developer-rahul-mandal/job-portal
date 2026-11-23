"use client";

import React, { useState, useEffect, useRef } from "react";
import { OtpInput } from "@/components/auth/otp-input";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  redirectUrl?: string;
  initialMode?: "login" | "register";
}

export default function AuthModal({
  isOpen,
  onClose,
  onSuccess,
  redirectUrl,
  initialMode = "login",
}: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [step, setStep] = useState<"input" | "otp">("input");

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"APPLICANT" | "RECRUITER">("APPLICANT");
  const [otp, setOtp] = useState("");

  // States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync mode with prop
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const [prevInitialMode, setPrevInitialMode] = useState(initialMode);
  if (isOpen !== prevIsOpen || initialMode !== prevInitialMode) {
    setPrevIsOpen(isOpen);
    setPrevInitialMode(initialMode);
    setMode(initialMode);
    setStep("input");
    setErrorMessage(null);
  }

  // Handle ESC key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "auto";
    };
  }, [isOpen, onClose]);

  // Countdown timer for resend OTP
  useEffect(() => {
    if (countdown <= 0) return;
    const interval = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [countdown]);

  if (!isOpen) return null;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    if (mode === "register") {
      const trimmedName = name.trim();
      if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 150) {
        setErrorMessage("Please enter a valid full name (2–150 characters).");
        return;
      }
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register/send-otp" : "/api/auth/login/send-otp";
      const payload =
        mode === "register"
          ? { name: name.trim(), email: trimmedEmail, role }
          : { email: trimmedEmail };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to send verification code. Please try again.");
        return;
      }

      setStep("otp");
      setCountdown(data.resendAfter || 60);
    } catch (err) {
      console.error("Send OTP error:", err);
      setErrorMessage("Network error occurred. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.length !== 6) {
      setErrorMessage("Please enter the complete 6-digit code.");
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register/verify-otp" : "/api/auth/login/verify-otp";
      const payload =
        mode === "register"
          ? { name: name.trim(), email: email.trim(), role, otp }
          : { email: email.trim(), otp };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Invalid or expired verification code.");
        return;
      }

      // Authentication succeeded
      onSuccess();
    } catch (err) {
      console.error("Verify OTP error:", err);
      setErrorMessage("Network error occurred during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0 || isLoading) return;
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const endpoint = mode === "register" ? "/api/auth/register/send-otp" : "/api/auth/login/send-otp";
      const payload =
        mode === "register"
          ? { name: name.trim(), email: email.trim(), role }
          : { email: email.trim() };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to resend code.");
        return;
      }

      setCountdown(data.resendAfter || 60);
      setOtp("");
    } catch {
      setErrorMessage("Unable to resend verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 overflow-hidden relative"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm mx-auto mb-3">
            JP
          </div>
          <h2 id="auth-modal-title" className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {step === "otp"
              ? "Verify Email"
              : mode === "login"
              ? "Sign in to Apply"
              : "Create an Account"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {step === "otp"
              ? `We sent a 6-digit code to ${email}`
              : "Authentication is required to track your application."}
          </p>
        </div>

        {/* Mode Switch Tabs (Only during initial input) */}
        {step === "input" && (
          <div className="flex border-b border-zinc-200 dark:border-zinc-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setErrorMessage(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                mode === "login"
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setErrorMessage(null);
              }}
              className={`flex-1 pb-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                mode === "register"
                  ? "border-zinc-900 text-zinc-900 dark:border-white dark:text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Error Feedback */}
        {errorMessage && (
          <div className="p-3 mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
            {errorMessage}
          </div>
        )}

        {/* Step 1: Input Form */}
        {step === "input" && (
          <div className="space-y-4">
            <form onSubmit={handleSendOtp} className="space-y-4">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Account Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole("APPLICANT")}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors ${
                          role === "APPLICANT"
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 font-semibold"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Job Seeker
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("RECRUITER")}
                        className={`py-2 px-3 rounded-lg text-xs font-medium border text-center transition-colors ${
                          role === "RECRUITER"
                            ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900 font-semibold"
                            : "border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400"
                        }`}
                      >
                        Recruiter
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isLoading ? "Sending Code..." : "Continue with Email"}
              </button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 font-medium">
                  or
                </span>
              </div>
            </div>

            <GoogleSignInButton redirect={redirectUrl} disabled={isLoading} />
          </div>
        )}

        {/* Step 2: OTP Verification */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="flex justify-center">
              <OtpInput
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="w-full py-2.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isLoading ? "Verifying..." : "Verify & Continue"}
            </button>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-2">
              <button
                type="button"
                onClick={() => {
                  setStep("input");
                  setErrorMessage(null);
                  setOtp("");
                }}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 underline"
              >
                ← Change Email
              </button>

              <button
                type="button"
                disabled={countdown > 0 || isLoading}
                onClick={handleResendOtp}
                className="hover:text-zinc-900 dark:hover:text-zinc-200 underline disabled:opacity-50 disabled:no-underline"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
