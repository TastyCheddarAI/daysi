import { createServer } from "node:http";

import type { AppEnv } from "./config";
import {
  createAppRepositories,
  type AppRepositories,
} from "./persistence/app-repositories";
import { routeRequest } from "./router";

// CORS headers for all responses
const setCorsHeaders = (response: any, origin: string): void => {
  response.setHeader("Access-Control-Allow-Origin", origin || "*");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, idempotency-key");
  response.setHeader("Access-Control-Allow-Credentials", "true");
};

export const createApiServer = (
  env: AppEnv,
  repositories: AppRepositories = createAppRepositories(env),
) =>
  createServer((request, response) => {
    const origin = request.headers.origin || "";
    
    // Set CORS headers for all responses
    setCorsHeaders(response, origin);
    
    // Handle OPTIONS preflight requests
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    
    routeRequest(request, response, env, repositories).catch((error) => {
      const message = error instanceof Error ? error.message : "Unhandled server error.";

      response.writeHead(500, {
        "content-type": "application/json; charset=utf-8",
      });
      response.end(
        JSON.stringify({
          ok: false,
          error: {
            code: "internal_error",
            message,
          },
        }),
      );
    });
  });
