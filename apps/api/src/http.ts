import type { IncomingMessage, ServerResponse } from "node:http";

import type { ApiErrorCode } from "../../../packages/contracts/src";
import { errorEnvelopeSchema } from "../../../packages/contracts/src";

export const sendJson = (
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void => {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
};

export const sendError = (
  response: ServerResponse,
  statusCode: number,
  code: ApiErrorCode,
  message: string,
  details?: Record<string, unknown>,
): void => {
  sendJson(
    response,
    statusCode,
    errorEnvelopeSchema.parse({
      ok: false,
      error: {
        code,
        message,
        details,
      },
    }),
  );
};

export const readJsonBody = async <T>(
  request: IncomingMessage,
  parser: (payload: unknown) => T,
): Promise<T> => {
  const raw = await readRawBody(request);
  const parsed = raw.length === 0 ? {} : JSON.parse(raw);

  return parser(parsed);
};

export const readRawBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
};
