import {
  hasProcessedStripeEvent,
  markStripeEventProcessed,
  recallIdempotentResponse,
  rememberIdempotentResponse,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface IdempotentResponseRecord {
  statusCode: number;
  payload: unknown;
}

export interface ReliabilityRepository {
  idempotency: {
    get(
      scope: string,
      key: string,
    ): Awaitable<IdempotentResponseRecord | undefined>;
    save(input: {
      scope: string;
      key: string;
      response: IdempotentResponseRecord;
    }): Awaitable<void>;
  };
  webhookEvents: {
    hasProcessed(input: {
      source: "stripe";
      eventId: string;
    }): Awaitable<boolean>;
    markProcessed(input: {
      source: "stripe";
      eventId: string;
    }): Awaitable<void>;
  };
}

export const createInMemoryReliabilityRepository = (): ReliabilityRepository => ({
  idempotency: {
    get: (scope, key) => recallIdempotentResponse(scope, key),
    save: (input) => {
      rememberIdempotentResponse(input.scope, input.key, input.response);
    },
  },
  webhookEvents: {
    hasProcessed: (input) => {
      if (input.source !== "stripe") {
        return false;
      }

      return hasProcessedStripeEvent(input.eventId);
    },
    markProcessed: (input) => {
      if (input.source === "stripe") {
        markStripeEventProcessed(input.eventId);
      }
    },
  },
});
