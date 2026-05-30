"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Loader2, Search, X } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type AsyncEntityComboboxRenderState = {
  active: boolean;
  query: string;
};

export type AsyncEntityComboboxProps<TItem> = {
  id: string;
  label: string;
  placeholder: string;
  loadItems: (query: string, signal: AbortSignal) => Promise<readonly TItem[]>;
  getItemKey: (item: TItem) => string;
  renderItem: (item: TItem, state: AsyncEntityComboboxRenderState) => ReactNode;
  onSelect: (item: TItem) => void;
  minQueryLength?: number;
  debounceMs?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  loadingLabel?: string;
  clearLabel?: string;
  className?: string;
};

function normalizeComboboxQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function AsyncEntityCombobox<TItem>({
  id,
  label,
  placeholder,
  loadItems,
  getItemKey,
  renderItem,
  onSelect,
  minQueryLength = 2,
  debounceMs = 180,
  emptyTitle = "No matches found",
  emptyDescription = "Try a different search term.",
  clearLabel = "Clear",
  className,
}: AsyncEntityComboboxProps<TItem>): React.JSX.Element {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<readonly TItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [failed, setFailed] = useState(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const requestIdRef = useRef(0);

  const normalizedQuery = useMemo(() => normalizeComboboxQuery(query), [query]);
  const hasSearchableQuery = normalizedQuery.length >= minQueryLength;
  const overlayId = `${id}-results`;
  const activeDescendant =
    open && activeIndex >= 0 ? `${overlayId}-${activeIndex}` : undefined;

  useEffect(() => {
    if (!hasSearchableQuery) {
      return;
    }

    const controller = new AbortController();
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    const timeoutId = window.setTimeout(async () => {
      setLoading(true);
      setFailed(false);

      try {
        const result = await loadItems(normalizedQuery, controller.signal);

        if (requestIdRef.current !== requestId || controller.signal.aborted) {
          return;
        }

        setItems(result);
        setOpen(true);
        setActiveIndex(result.length > 0 ? 0 : -1);
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        console.error("Async combobox search failed:", error);

        if (requestIdRef.current === requestId) {
          setItems([]);
          setFailed(true);
          setOpen(true);
          setActiveIndex(-1);
        }
      } finally {
        if (requestIdRef.current === requestId && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, debounceMs);

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [debounceMs, hasSearchableQuery, loadItems, normalizedQuery]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent): void {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function resetResults(): void {
    requestIdRef.current += 1;
    setItems([]);
    setOpen(false);
    setLoading(false);
    setFailed(false);
    setActiveIndex(-1);
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    const nextQuery = event.target.value;
    const nextNormalizedQuery = normalizeComboboxQuery(nextQuery);

    setQuery(nextQuery);

    if (nextNormalizedQuery.length < minQueryLength) {
      resetResults();
      return;
    }

    setOpen(true);
  }

  function clearSearch(): void {
    setQuery("");
    resetResults();
    inputRef.current?.focus();
  }

  function selectItem(item: TItem): void {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(item);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      if (open) {
        event.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
      }

      return;
    }

    if (!open || !hasSearchableQuery) {
      if (event.key === "ArrowDown" && items.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex(0);
      }

      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();

      setActiveIndex((current) => {
        if (items.length === 0) {
          return -1;
        }

        return current >= items.length - 1 ? 0 : current + 1;
      });

      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();

      setActiveIndex((current) => {
        if (items.length === 0) {
          return -1;
        }

        return current <= 0 ? items.length - 1 : current - 1;
      });

      return;
    }

    if (event.key === "Enter") {
      const selected = activeIndex >= 0 ? items[activeIndex] : null;

      if (selected) {
        event.preventDefault();
        selectItem(selected);
      }
    }
  }

  const showOverlay = open && hasSearchableQuery;

  return (
    <div ref={rootRef} className={cn("ops-search min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="relative">
        <Search className="ops-search-icon" aria-hidden="true" />

        <input
          ref={inputRef}
          id={id}
          type="search"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (hasSearchableQuery) {
              setOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showOverlay}
          aria-controls={overlayId}
          aria-activedescendant={activeDescendant}
          className={cn(
            "ops-search-input pr-12",
            loading && "border-brand-500/50",
          )}
        />

        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {loading ? (
            <span
              className="inline-flex size-8 shrink-0 items-center justify-center border border-border bg-surface text-muted"
              aria-label="Searching"
              title="Searching"
            >
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            </span>
          ) : null}

          {query ? (
            <button
              type="button"
              className="inline-flex size-8 shrink-0 items-center justify-center border border-border bg-surface text-muted transition hover:border-border-strong hover:bg-background hover:text-foreground focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              onClick={clearSearch}
              aria-label={clearLabel}
              title={clearLabel}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {showOverlay ? (
        <div id={overlayId} role="listbox" className="ops-search-results z-50">
          <div className="flex items-center justify-between border-b border-border-subtle px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
              Results
            </span>
            <span className="text-xs font-semibold text-muted">
              Enter to open
            </span>
          </div>

          {items.length > 0 ? (
            <div className="grid">
              {items.map((item, index) => {
                const key = getItemKey(item);
                const active = index === activeIndex;

                return (
                  <button
                    key={key}
                    id={`${overlayId}-${index}`}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={cn(
                      "ops-search-result",
                      active && "ops-search-result-active",
                    )}
                    onMouseEnter={() => setActiveIndex(index)}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectItem(item)}
                  >
                    {renderItem(item, {
                      active,
                      query: normalizedQuery,
                    })}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="border-l-2 border-l-border px-4 py-4">
              <p className="text-sm font-semibold text-foreground">
                {failed ? "Search failed" : emptyTitle}
              </p>

              <p className="mt-1 text-xs leading-5 text-muted">
                {failed
                  ? "Refresh or try again. If this continues, check the search API."
                  : emptyDescription}
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
