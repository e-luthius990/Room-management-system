"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { AsyncEntityCombobox } from "@/components/search/async-entity-combobox";
import {
  StatusIndicator,
  type StatusTone,
} from "@/components/ui/StatusIndicator";
import { cn } from "@/lib/utils/cn";

export type OperationsSearchScope =
  | "security"
  | "reception"
  | "manager"
  | "executive";

type OperationSearchResult = {
  id: string;
  type: "guest" | "room";
  title: string;
  subtitle: string;
  meta: string | null;
  href: string;
  statusLabel: string | null;
  statusTone: StatusTone;
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
  return type === "room" ? "Room" : "Guest";
}

function getTypeMarkerClass(type: OperationSearchResult["type"]): string {
  return type === "room" ? "border-l-sky-600" : "border-l-emerald-600";
}

function OperationSearchResultRow({
  item,
}: {
  item: OperationSearchResult;
}): React.JSX.Element {
  const isRoom = item.type === "room";

  return (
    <div
      className={cn(
        "grid min-w-0 gap-3 border-l-2 pl-3 sm:grid-cols-[4.75rem_minmax(0,1fr)_auto] sm:items-center",
        getTypeMarkerClass(item.type),
      )}
    >
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {getTypeLabel(item.type)}
        </div>

        {isRoom ? (
          <div className="mt-1 text-xl font-semibold tracking-[-0.045em] text-foreground">
            {item.title}
          </div>
        ) : (
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {item.title}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="truncate text-sm text-foreground">{item.subtitle}</div>

        {item.meta ? (
          <div className="mt-1 truncate text-xs text-muted">{item.meta}</div>
        ) : null}
      </div>

      {item.statusLabel ? (
        <div className="shrink-0 sm:flex sm:justify-end">
          <StatusIndicator
            compact
            withDot
            tone={item.statusTone}
            label={item.statusLabel}
          />
        </div>
      ) : null}
    </div>
  );
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
      const normalizedQuery = query.trim().replace(/\s+/g, " ");

      if (normalizedQuery.length < 2) {
        return [];
      }

      const params = new URLSearchParams({
        scope,
        q: normalizedQuery,
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
      debounceMs={250}
      className={cn("w-full min-w-0", className)}
      loadItems={loadItems}
      getItemKey={(item) => `${item.type}:${item.id}`}
      onSelect={(item) => {
        router.push(item.href);
      }}
      emptyTitle="No matching records"
      emptyDescription="Try a guest name, phone number, ID/passport number, organization, or room number."
      renderItem={(item) => <OperationSearchResultRow item={item} />}
    />
  );
}
