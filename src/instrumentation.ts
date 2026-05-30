import type { Instrumentation } from "next";
import { logError, logEvent } from "@/lib/observability/logger";

export function register(): void {
  logEvent("info", "runtime.started", {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
    node_env: process.env.NODE_ENV ?? "development",
  });
}

export const onRequestError: Instrumentation.onRequestError = async (
  error,
  request,
  context,
) => {
  logError("request.unhandled_error", error, {
    method: request.method,
    path: request.path,
    route_path: context.routePath,
    route_type: context.routeType,
    router_kind: context.routerKind,
  });
};
