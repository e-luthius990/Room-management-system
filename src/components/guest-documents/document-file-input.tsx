"use client";

import * as React from "react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "Unknown size";
  }

  if (size < 1024 * 1024) {
    return `${Math.ceil(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentFileInput(): React.JSX.Element {
  const hintId = React.useId();
  const [file, setFile] = React.useState<File | null>(null);

  const isTooLarge = file ? file.size > MAX_SIZE_BYTES : false;

  return (
    <div className="field-group">
      <label htmlFor="guestDocumentFile" className="field-label">
        Document file
        <span aria-hidden="true" className="ml-1 text-danger-700">
          *
        </span>
      </label>

      <div className="relative overflow-hidden border border-dashed border-border bg-surface-raised px-4 py-4 transition hover:border-border-strong focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20">
        <input
          id="guestDocumentFile"
          required
          name="file"
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          aria-describedby={hintId}
          className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
          }}
        />

        <div className="flex min-h-20 flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {file ? file.name : "Select a private document"}
            </p>

            <p
              id={hintId}
              className={[
                "mt-1 text-xs leading-5",
                isTooLarge ? "font-semibold text-danger-700" : "text-muted",
              ].join(" ")}
            >
              {file
                ? `${formatFileSize(file.size)} selected`
                : "PDF, JPG, PNG, or WebP. Maximum size 10 MB."}
            </p>
          </div>

          <span className="inline-flex min-h-10 shrink-0 items-center justify-center border border-border bg-surface px-4 py-2 text-sm font-semibold text-foreground">
            Choose file
          </span>
        </div>
      </div>

      {isTooLarge ? (
        <p className="field-error" role="alert">
          This file is larger than 10 MB. Choose a smaller document.
        </p>
      ) : null}
    </div>
  );
}
