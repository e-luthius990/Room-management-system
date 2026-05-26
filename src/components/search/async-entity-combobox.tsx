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
  loadingLabel = "Searching",
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
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>

      <div className="flex min-w-0 items-center gap-2 border border-border bg-background px-3 py-2 transition focus-within:border-foreground">
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
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
        />

        {loading ? (
          <span className="shrink-0 border border-border bg-surface px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {loadingLabel}
          </span>
        ) : null}

        {query ? (
          <button
            type="button"
            className="shrink-0 border border-border bg-surface px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-background"
            onClick={clearSearch}
          >
            {clearLabel}
          </button>
        ) : null}
      </div>

      {showOverlay ? (
        <div
          id={overlayId}
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-50 max-h-[24rem] overflow-y-auto border border-border bg-background shadow-xl"
        >
          {items.length > 0 ? (
            <div className="grid gap-1 p-1.5">
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
                      "block w-full border px-3 py-2.5 text-left transition",
                      active
                        ? "border-foreground bg-surface"
                        : "border-transparent hover:border-border hover:bg-surface",
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
