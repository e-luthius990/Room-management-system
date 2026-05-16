"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type AuthMessageCleanerProps = {
  delay?: number;
};

export function AuthMessageCleaner({ delay = 3500 }: AuthMessageCleanerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");

    if (!success && !error) {
      return;
    }

    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());

      params.delete("success");
      params.delete("error");

      const query = params.toString();

      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    }, delay);

    return () => clearTimeout(timeout);
  }, [delay, pathname, router, searchParams]);

  return null;
}
