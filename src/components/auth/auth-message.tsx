"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

import { getAuthMessage, getSuccessMessage } from "@/lib/auth/auth-errors";

type AuthMessageProps = {
  error?: string;
  success?: string;
  duration?: number;
};

type AuthMessageBannerProps = {
  message: string;
  isError: boolean;
  duration: number;
};

const EXIT_MS = 180;
const DEFAULT_DURATION_MS = 4200;

function clearAuthMessageFromUrl(): void {
  const url = new URL(window.location.href);

  const hadError = url.searchParams.has("error");
  const hadSuccess = url.searchParams.has("success");

  if (!hadError && !hadSuccess) {
    return;
  }

  url.searchParams.delete("error");
  url.searchParams.delete("success");

  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState(window.history.state, "", nextUrl);
}

function AuthMessageBanner({
  message,
  isError,
  duration,
}: AuthMessageBannerProps): React.JSX.Element | null {
  const [mounted, setMounted] = useState(true);
  const [closing, setClosing] = useState(false);

  const closeTimerRef = useRef<number | null>(null);
  const unmountTimerRef = useRef<number | null>(null);
  const closedRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (unmountTimerRef.current !== null) {
      window.clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    if (closedRef.current) {
      return;
    }

    closedRef.current = true;
    clearTimers();
    setClosing(true);

    unmountTimerRef.current = window.setTimeout(() => {
      setMounted(false);
    }, EXIT_MS);
  }, [clearTimers]);

  useEffect(() => {
    clearAuthMessageFromUrl();

    if (duration > 0) {
      closeTimerRef.current = window.setTimeout(close, duration);
    }

    return clearTimers;
  }, [clearTimers, close, duration]);

  if (!mounted) {
    return null;
  }

  const toneClass = isError
    ? {
        shell: "border-danger-200 bg-danger-50 text-danger-800",
        icon: "bg-danger-100 text-danger-700",
        accent: "bg-danger-500",
        button:
          "text-danger-700/70 hover:bg-danger-100 hover:text-danger-900 focus-visible:ring-danger-300",
      }
    : {
        shell: "border-success-200 bg-success-50 text-success-800",
        icon: "bg-success-100 text-success-700",
        accent: "bg-success-500",
        button:
          "text-success-700/70 hover:bg-success-100 hover:text-success-900 focus-visible:ring-success-300",
      };

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={[
        "fixed left-1/2 top-5 z-[100] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 transition-[opacity,transform] duration-200 ease-out",
        closing
          ? "-translate-x-1/2 -translate-y-2 opacity-0"
          : "-translate-x-1/2 translate-y-0 opacity-100",
      ].join(" ")}
    >
      <div
        className={[
          "relative flex items-start gap-3 border px-4 py-3 text-sm shadow-xs",
          toneClass.shell,
        ].join(" ")}
      >
        <span
          className={[
            "absolute inset-y-2.5 left-0 w-1",
            toneClass.accent,
          ].join(" ")}
          aria-hidden="true"
        />

        <span
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center",
            toneClass.icon,
          ].join(" ")}
          aria-hidden="true"
        >
          {isError ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </span>

        <p className="min-w-0 flex-1 pt-0.5 font-medium leading-6">{message}</p>

        <button
          type="button"
          onClick={close}
          aria-label="Dismiss message"
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            toneClass.button,
          ].join(" ")}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

export function AuthMessage({
  error,
  success,
  duration = DEFAULT_DURATION_MS,
}: AuthMessageProps): React.JSX.Element | null {
  const errorMessage = getAuthMessage(error);
  const successMessage = getSuccessMessage(success);
  const message = errorMessage ?? successMessage;

  if (!message) {
    return null;
  }

  return (
    <AuthMessageBanner
      key={`${errorMessage ? "error" : "success"}:${message}`}
      message={message}
      isError={Boolean(errorMessage)}
      duration={duration}
    />
  );
}
