import { createServer } from "node:http";
import { randomUUID } from "node:crypto";

import type { AppEnv } from "./config";
import {
  createAppRepositories,
  type AppRepositories,
} from "./persistence/app-repositories";
import { routeRequest } from "./router";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const ALWAYS_ALLOWED_ORIGINS = new Set([
  "http://localhost:8080",
  "http://127.0.0.1:8080",
]);

const buildAllowedOrigins = (env: AppEnv): Set<string> => {
  const origins = new Set(ALWAYS_ALLOWED_ORIGINS);
  if (env.DAYSI_CORS_ORIGINS) {
    for (const o of env.DAYSI_CORS_ORIGINS.split(",")) {
      const trimmed = o.trim();
      if (trimmed) origins.add(trimmed);
    }
  }
  // Always include the primary domain and staging
  origins.add(`https://${env.DAYSI_PUBLIC_PRIMARY_DOMAIN}`);
  origins.add(`https://staging.${env.DAYSI_PUBLIC_PRIMARY_DOMAIN}`);
  return origins;
};

const setCorsHeaders = (
  response: any,
  requestOrigin: string,
  allowedOrigins: Set<string>,
): void => {
  const origin = allowedOrigins.has(requestOrigin) ? requestOrigin : null;
  if (origin) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
    response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, idempotency-key",
    );
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }
};

// ---------------------------------------------------------------------------
// Rate limiting (in-memory sliding window — sufficient for single-instance)
// For multi-instance deployments, replace with a Redis-backed store.
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 20; // requests per window per IP on auth endpoints

// Prune stale entries every 5 minutes to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60_000).unref();

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);

const isRateLimited = (ip: string): boolean => {
  if (LOOPBACK_IPS.has(ip)) return false;

  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
};

const AUTH_PATHS = new Set([
  "/v1/auth/session/exchange",
  "/v1/admin/bootstrap-owner",
  "/v1/admin/bootstrap-admin",
]);

const getClientIp = (request: any): string => {
  const forwarded = request.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return request.socket?.remoteAddress ?? "unknown";
};

// ---------------------------------------------------------------------------
// Server factory
// ---------------------------------------------------------------------------

export const createApiServer = (
  env: AppEnv,
  repositories: AppRepositories = createAppRepositories(env),
) => {
  const allowedOrigins = buildAllowedOrigins(env);

  return createServer((request, response) => {
    const requestOrigin = request.headers.origin ?? "";

    // Set CORS headers for all responses
    setCorsHeaders(response, requestOrigin, allowedOrigins);

    // Handle OPTIONS preflight
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }

    // Rate-limit auth endpoints by client IP
    const pathname = new URL(
      request.url ?? "/",
      `http://${request.headers.host ?? "localhost"}`,
    ).pathname;

    if (AUTH_PATHS.has(pathname)) {
      const ip = getClientIp(request);
      if (isRateLimited(ip)) {
        response.writeHead(429, { "content-type": "application/json; charset=utf-8" });
        response.end(
          JSON.stringify({
            ok: false,
            error: { code: "rate_limited", message: "Too many requests. Please try again later." },
          }),
        );
        return;
      }
    }

    const requestId =
      (request.headers["x-request-id"] as string | undefined) ?? randomUUID();
    const startMs = Date.now();
    response.setHeader("X-Request-Id", requestId);

    routeRequest(request, response, env, repositories)
      .then(() => {
        console.log(
          JSON.stringify({
            ts: new Date().toISOString(),
            request_id: requestId,
            method: request.method,
            path: pathname,
            status: response.statusCode,
            duration_ms: Date.now() - startMs,
            actor_user_id: (response.getHeader("x-actor-id") as string) || null,
          }),
        );
      })
      .catch((error) => {
        const message = error instanceof Error ? error.message : "Unhandled server error.";
        console.error(
          JSON.stringify({
            ts: new Date().toISOString(),
            request_id: requestId,
            level: "error",
            message,
          }),
        );
        response.writeHead(500, { "content-type": "application/json; charset=utf-8" });
        response.end(
          JSON.stringify({ ok: false, error: { code: "internal_error", message } }),
        );
      });
  });
};
