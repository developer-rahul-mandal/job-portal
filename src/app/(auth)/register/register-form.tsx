"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { OtpInput } from "@/components/auth/otp-input";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { sanitizeRedirectPath, type UserRole } from "@/lib/auth/redirects";

interface RegisterFormProps {
  redirectParam?: string | null;
}

export function RegisterForm({ redirectParam }: RegisterFormProps) {
  const router = useRouter();

  const [step, setStep] = useState<"DETAILS" | "OTP">("DETAILS");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"APPLICANT" | "RECRUITER">("APPLICANT");
  const [otp, setOtp] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);

  // Timer for resend cooldown countdown
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (trimmedName.length < 2 || trimmedName.length > 150) {
      setErrorMessage("Full name must be between 2 and 150 characters.");
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Failed to send verification code.");
        return;
      }

      setSuccessMessage(
        data.message || "Registration code sent to your email."
      );
      setCooldown(data.resendAfter || 60);
      setStep("OTP");
      setOtp("");
      setRemainingAttempts(null);
    } catch {
      setErrorMessage("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isResending) return;

    setErrorMessage(null);
    setIsResending(true);

    try {
      const res = await fetch("/api/auth/register/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Unable to resend verification code.");
        return;
      }

      setSuccessMessage("A fresh verification code was sent to your email.");
      setCooldown(data.resendAfter || 60);
      setOtp("");
      setRemainingAttempts(null);
    } catch {
      setErrorMessage("Failed to resend verification code. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setErrorMessage("Please enter a valid 6-digit verification code.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          otp: otp.trim(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.message || "Invalid or expired verification code.");
        if (typeof data.remainingAttempts === "number") {
          setRemainingAttempts(data.remainingAttempts);
        }
        return;
      }

      // Success: determine target destination safely
      const userRole: UserRole = data.user?.role || role;
      const destination = sanitizeRedirectPath(redirectParam, userRole);

      setSuccessMessage("Registration successful! Redirecting to your workspace...");

      setTimeout(() => {
        router.push(destination);
        router.refresh();
      }, 500);
    } catch {
      setErrorMessage("Network error during verification. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <AuthCard
      title={step === "DETAILS" ? "Create your account" : "Verify your email"}
      subtitle={
        step === "DETAILS"
          ? "Join JobPortal as a job seeker or employer to get started."
          : `We sent a 6-digit verification code to ${email}.`
      }
    >
      {/* Alert Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-6 p-3.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-sm flex items-start gap-2.5"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <div>
            <span>{errorMessage}</span>
            {remainingAttempts !== null && (
              <span className="block mt-1 font-medium text-xs">
                {remainingAttempts === 0
                  ? "Maximum attempts reached. Please request a new code."
                  : `${remainingAttempts} attempt${remainingAttempts === 1 ? "" : "s"} remaining.`}
              </span>
            )}
          </div>
        </div>
      )}

      {successMessage && (
        <div
          role="status"
          className="mb-6 p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-sm flex items-start gap-2.5"
        >
          <svg
            className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span>{successMessage}</span>
        </div>
      )}

      {step === "DETAILS" ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-2">
              I want to
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("APPLICANT")}
                disabled={isLoading}
                className={`p-3 text-left rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
                  role === "APPLICANT"
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-zinc-100/10 font-semibold text-zinc-900 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Find a Job
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Job Seeker Profile
                </div>
              </button>

              <button
                type="button"
                onClick={() => setRole("RECRUITER")}
                disabled={isLoading}
                className={`p-3 text-left rounded-lg border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
                  role === "RECRUITER"
                    ? "border-zinc-900 dark:border-zinc-100 bg-zinc-900/5 dark:bg-zinc-100/10 font-semibold text-zinc-900 dark:text-zinc-100"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                }`}
              >
                <div className="font-medium text-zinc-900 dark:text-zinc-100">
                  Hire Talent
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Employer / Recruiter
                </div>
              </button>
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
            >
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              disabled={isLoading}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-colors"
            />
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1.5"
            >
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full px-3.5 py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Sending code...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200 dark:border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs uppercase tracking-wider">
              <span className="bg-white dark:bg-zinc-900 px-3 text-zinc-500">
                Or continue with
              </span>
            </div>
          </div>

          <GoogleSignInButton redirect={redirectParam} disabled={isLoading} />
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
                6-digit code
              </label>
              <button
                type="button"
                onClick={() => {
                  setStep("DETAILS");
                  setErrorMessage(null);
                }}
                className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline focus:outline-none"
              >
                Edit details
              </button>
            </div>

            <OtpInput
              value={otp}
              onChange={setOtp}
              disabled={isLoading}
              error={Boolean(errorMessage)}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.length !== 6}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-100 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>Completing registration...</span>
              </>
            ) : (
              <span>Confirm & Register</span>
            )}
          </button>

          <div className="text-center text-sm">
            {cooldown > 0 ? (
              <span className="text-zinc-500 text-xs">
                Resend code in <strong className="font-mono">{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || isLoading}
                className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline focus:outline-none disabled:opacity-50"
              >
                {isResending ? "Resending..." : "Didn't receive code? Resend"}
              </button>
            )}
          </div>
        </form>
      )}

      {/* Footer navigation */}
      <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-800 text-center text-sm text-zinc-600 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href={
            redirectParam
              ? `/login?redirect=${encodeURIComponent(redirectParam)}`
              : "/login"
          }
          className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline focus:outline-none"
        >
          Sign in
        </Link>
      </div>
    </AuthCard>
  );
}
