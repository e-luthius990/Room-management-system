"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { AsyncEntityCombobox } from "@/components/search/async-entity-combobox";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

export type OperationsSearchScope =
  | "security"
  | "reception"
  | "manager"
  | "executive";

type SearchResultTone = "default" | "success" | "warning" | "danger" | "info";

type OperationSearchResult = {
  id: string;
  type: "guest" | "room";
  title: string;
  subtitle: string;
  meta: string | null;
  href: string;
  statusLabel: string | null;
  statusTone: SearchResultTone;
};

type OperationSearchResponse = {
  items: OperationSearchResult[];
};

type OperationsSearchBoxProps = {
  scope: OperationsSearchScope;
  className?: string;
  placeholder?: string;
};

function getTypeLabel(type: OperationSearchResult["type"]): string {
  if (type === "room") {
    return "Room";
  }

  return "Guest";
}

export function OperationsSearchBox({
  scope,
  className,
  placeholder = "Search guests, rooms, phone, ID...",
}: OperationsSearchBoxProps): React.JSX.Element {
  const router = useRouter();

  const loadItems = useCallback(
    async (
      query: string,
      signal: AbortSignal,
    ): Promise<readonly OperationSearchResult[]> => {
      const params = new URLSearchParams({
        scope,
        q: query,
      });

      const response = await fetch(`/api/operations/search?${params}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal,
      });

      if (!response.ok) {
        throw new Error(
          `Operations search failed with status ${response.status}`,
        );
      }

      const payload = (await response.json()) as OperationSearchResponse;

      return Array.isArray(payload.items) ? payload.items : [];
    },
    [scope],
  );

  return (
    <AsyncEntityCombobox<OperationSearchResult>
      id={`operations-search-${scope}`}
      label="Search operations"
      placeholder={placeholder}
      minQueryLength={2}
      debounceMs={180}
      className={cn("min-w-0", className)}
      loadItems={loadItems}
      getItemKey={(item) => `${item.type}:${item.id}`}
      onSelect={(item) => {
        router.push(item.href);
      }}
      emptyTitle="No matching records"
      emptyDescription="Try a guest name, phone number, ID/passport number, organization, or room number."
      renderItem={(item) => (
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                {getTypeLabel(item.type)}
              </span>

              <span className="truncate text-sm font-semibold text-foreground">
                {item.title}
              </span>
            </div>

            <div className="mt-1 truncate text-xs text-muted">
              {item.subtitle}
            </div>

            {item.meta ? (
              <div className="mt-1 truncate text-xs text-muted">
                {item.meta}
              </div>
            ) : null}
          </div>

          {item.statusLabel ? (
            <StatusIndicator
              compact
              withDot
              tone={item.statusTone}
              label={item.statusLabel}
            />
          ) : null}
        </div>
      )}
    />
  );
}
