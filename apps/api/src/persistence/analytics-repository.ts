import type { OperationalMetricEventRecord } from "../../../../packages/domain/src";

import {
  hasOperationalMetricEvent,
  listOperationalMetricEvents,
  saveOperationalMetricEvent,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface AnalyticsRepository {
  saveEvent(event: OperationalMetricEventRecord): Awaitable<void>;
  listAll(): Awaitable<OperationalMetricEventRecord[]>;
  hasEvent(input: {
    eventType: OperationalMetricEventRecord["eventType"];
    sourceOrderId?: string;
    referenceId?: string;
  }): Awaitable<boolean>;
}

export const createInMemoryAnalyticsRepository = (): AnalyticsRepository => ({
  saveEvent: (event) => {
    saveOperationalMetricEvent(event);
  },
  listAll: listOperationalMetricEvents,
  hasEvent: hasOperationalMetricEvent,
});
