"use client";

import { useState } from "react";

import { cn } from "@/lib/utils/cn";

type AccountAvatarSize = "sm" | "md" | "lg" | "xl";

type AccountAvatarProps = {
  name: string;
  photoUpdatedAt?: string | null;
  size?: AccountAvatarSize;
  className?: string;
};

const sizeClass: Record<AccountAvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-24 text-2xl",
};

function getInitials(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  const initials = parts.map((part) => part[0]?.toUpperCase()).join("");

  return initials || "U";
}

function getPhotoSrc(photoUpdatedAt?: string | null): string {
  const version = photoUpdatedAt
    ? `?v=${encodeURIComponent(photoUpdatedAt)}`
    : "";

  return `/profile/photo${version}`;
}

export function AccountAvatar({
  name,
  photoUpdatedAt,
  size = "md",
  className,
}: AccountAvatarProps): React.JSX.Element {
  const [failed, setFailed] = useState(false);

  return (
    <span
      className={cn(
        "inline-grid shrink-0 place-items-center overflow-hidden border border-border bg-brand-700 font-bold text-white shadow-xs",
        sizeClass[size],
        className,
      )}
      aria-hidden="true"
    >
      {photoUpdatedAt && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={getPhotoSrc(photoUpdatedAt)}
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
