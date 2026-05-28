"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X } from "lucide-react";

import { AccountAvatar } from "@/components/account/account-avatar";
import { cn } from "@/lib/utils/cn";

type AccountProfilePhotoFieldProps = {
  id?: string;
  name?: string;
  label?: string;
  displayName: string;
  photoUpdatedAt?: string | null;
  className?: string;
};

export function AccountProfilePhotoField({
  id = "profilePhoto",
  name = "profilePhoto",
  label = "Profile picture",
  displayName,
  photoUpdatedAt,
  className,
}: AccountProfilePhotoFieldProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0] ?? null;

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFileName(file?.name ?? "");
    setPreviewUrl(file ? URL.createObjectURL(file) : null);
  }

  function clearSelectedFile(): void {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setFileName("");
  }

  return (
    <div className={cn("field-group", className)}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>

      <div className="grid gap-3 border border-border bg-surface-2 p-3 sm:grid-cols-[7.5rem_minmax(0,1fr)] sm:items-center">
        <div className="relative size-28 overflow-hidden border border-border bg-surface">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : photoUpdatedAt ? (
            <AccountAvatar
              name={displayName}
              photoUpdatedAt={photoUpdatedAt}
              size="xl"
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
              <Camera className="size-8" aria-hidden="true" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em]">
                Photo
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="relative">
            <input
              ref={inputRef}
              id={id}
              name={name}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="user"
              onChange={handleFileChange}
              className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            />

            <div className="flex min-h-12 items-center justify-center gap-2 border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition hover:border-border-strong hover:bg-background">
              <ImagePlus className="size-4 text-muted" aria-hidden="true" />
              <span>{fileName ? "Change picture" : "Upload picture"}</span>
            </div>
          </div>

          <p className="mt-2 text-xs leading-5 text-muted">
            JPG, PNG, or WebP up to 4 MB. Use a clear front-facing photo.
          </p>

          <div className="mt-2 flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-xs font-semibold text-foreground">
              {fileName || (photoUpdatedAt ? "Current picture" : "No picture selected")}
            </span>

            {fileName ? (
              <button
                type="button"
                onClick={clearSelectedFile}
                className="inline-flex size-7 shrink-0 items-center justify-center border border-border bg-surface text-muted transition hover:bg-background hover:text-foreground"
                aria-label="Remove selected profile picture"
              >
                <X className="size-3.5" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
