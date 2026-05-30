type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<
  string,
  string | number | boolean | null | undefined
>;

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const configuredLevel =
  process.env.LOG_LEVEL === "debug" ||
  process.env.LOG_LEVEL === "info" ||
  process.env.LOG_LEVEL === "warn" ||
  process.env.LOG_LEVEL === "error"
    ? process.env.LOG_LEVEL
    : process.env.NODE_ENV === "production"
      ? "info"
      : "debug";

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[configuredLevel];
}

function serializeError(error: unknown): LogFields {
  if (error instanceof Error) {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: process.env.NODE_ENV === "production" ? undefined : error.stack,
    };
  }

  return {
    error_message: String(error),
  };
}

export function logEvent(
  level: LogLevel,
  event: string,
  fields: LogFields = {},
): void {
  if (!shouldLog(level)) {
    return;
  }

  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    service: "room-ops",
    ...fields,
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.info(line);
}

export function logError(
  event: string,
  error: unknown,
  fields: LogFields = {},
): void {
  logEvent("error", event, {
    ...fields,
    ...serializeError(error),
  });
}
