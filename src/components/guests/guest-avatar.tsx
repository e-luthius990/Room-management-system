"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

type GuestAvatarSize = "sm" | "md" | "lg";

type GuestAvatarProps = {
  guestId: string;
  name: string;
  photoPath?: string | null;
  photoUpdatedAt?: string | null;
  size?: GuestAvatarSize;
  className?: string;
};

type GuestNameWithPhotoProps = GuestAvatarProps & {
  children?: React.ReactNode;
};

const sizeClass: Record<GuestAvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-base",
};

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase()).join("");

  return initials || "G";
}

function getPhotoSrc({
  guestId,
  photoUpdatedAt,
}: {
  guestId: string;
  photoPath?: string | null;
  photoUpdatedAt?: string | null;
}): string | null {
  if (!guestId) {
    return null;
  }

  const version = photoUpdatedAt ? `?v=${encodeURIComponent(photoUpdatedAt)}` : "";

  return `/guests/${encodeURIComponent(guestId)}/photo${version}`;
}

export function GuestAvatar({
  guestId,
  name,
  photoPath,
  photoUpdatedAt,
  size = "md",
  className,
}: GuestAvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);
  const photoSrc = getPhotoSrc({ guestId, photoPath, photoUpdatedAt });

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden border border-border bg-surface-2 font-bold text-muted",
        sizeClass[size],
        className,
      )}
      aria-hidden="true"
    >
      {photoSrc && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoSrc}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      ) : (
        getInitials(name)
      )}
    </span>
  );
}

export function GuestNameWithPhoto({
  guestId,
  name,
  photoPath,
  photoUpdatedAt,
  size = "sm",
  className,
  children,
}: GuestNameWithPhotoProps): React.JSX.Element {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <GuestAvatar
        guestId={guestId}
        name={name}
        photoPath={photoPath}
        photoUpdatedAt={photoUpdatedAt}
        size={size}
      />

      <span className="min-w-0">
        <span className="block truncate font-semibold text-foreground">
          {name}
        </span>
        {children}
      </span>
    </span>
  );
}
