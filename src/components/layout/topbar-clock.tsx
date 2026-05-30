"use client";

import { useEffect, useMemo, useState, type JSX } from "react";

type TopbarClockProps = {
  initialIso: string;
};

const TIME_ZONE = "Africa/Kampala";

export function TopbarClock({ initialIso }: TopbarClockProps): JSX.Element {
  const [now, setNow] = useState(() => new Date(initialIso));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const { dateLabel, timeLabel } = useMemo(() => {
    const dateFormatter = new Intl.DateTimeFormat("en-UG", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: TIME_ZONE,
    });

    const timeFormatter = new Intl.DateTimeFormat("en-UG", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
      timeZone: TIME_ZONE,
    });

    return {
      dateLabel: dateFormatter.format(now),
      timeLabel: timeFormatter.format(now),
    };
  }, [now]);

  return (
    <div
      className="pointer-events-none hidden min-w-0 text-center md:block"
      aria-label={`${dateLabel}, ${timeLabel}`}
    >
      <div className="text-sm font-semibold leading-5 text-topbar-foreground">
        {timeLabel}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-topbar-muted">
        {dateLabel}
      </div>
    </div>
  );
}
