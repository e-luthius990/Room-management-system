"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, X } from "lucide-react";

import { getAuthMessage } from "@/lib/auth/auth-errors";

type AuthMessageProps = {
  error?: string;
  success?: string;
  duration?: number;
};

type AuthMessageBannerProps = {
  message: string;
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

  return (
    <div
      role="alert"
      aria-live="assertive"
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
          "border-danger-200 bg-danger-50 text-danger-800",
        ].join(" ")}
      >
        <span
          className={[
            "absolute inset-y-2.5 left-0 w-1",
            "bg-danger-500",
          ].join(" ")}
          aria-hidden="true"
        />

        <span
          className={[
            "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center",
            "bg-danger-100 text-danger-700",
          ].join(" ")}
          aria-hidden="true"
        >
          <AlertCircle className="h-4 w-4" />
        </span>

        <p className="min-w-0 flex-1 pt-0.5 font-medium leading-6">{message}</p>

        <button
          type="button"
          onClick={close}
          aria-label="Dismiss message"
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center transition",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
            "text-danger-700/70 hover:bg-danger-100 hover:text-danger-900 focus-visible:ring-danger-300",
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
  duration = DEFAULT_DURATION_MS,
}: AuthMessageProps): React.JSX.Element | null {
  const errorMessage = getAuthMessage(error);

  if (!errorMessage) {
    return null;
  }

  return (
    <AuthMessageBanner
      key={`error:${errorMessage}`}
      message={errorMessage}
      duration={duration}
    />
  );
}
