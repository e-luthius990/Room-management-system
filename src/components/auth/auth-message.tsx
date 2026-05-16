"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";

import { getAuthMessage, getSuccessMessage } from "@/lib/auth/auth-errors";

type AuthMessageProps = {
  error?: string;
  success?: string;
  duration?: number;
};

export function AuthMessage({
  error,
  success,
  duration = 3500,
}: AuthMessageProps): React.JSX.Element | null {
  const [visible, setVisible] = useState(true);

  const errorMessage = getAuthMessage(error);
  const successMessage = getSuccessMessage(success);

  const message = errorMessage ?? successMessage;

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration]);

  if (!message || !visible) {
    return null;
  }

  const isError = Boolean(errorMessage);

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={[
        "mb-5 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm",
        "animate-in fade-in duration-300",
        isError
          ? "border-danger-200 bg-danger-50 text-danger-700"
          : "border-success-200 bg-success-50 text-success-700",
      ].join(" ")}
    >
      <div className="mt-0.5 shrink-0">
        {isError ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
      </div>

      <p className="leading-6">{message}</p>
    </div>
  );
}
