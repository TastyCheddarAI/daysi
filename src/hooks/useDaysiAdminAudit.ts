import { useQuery } from "@tanstack/react-query";

import { useDaysiAdminSession } from "@/hooks/useDaysiAdminSession";
import {
  listDaysiAdminAuditLogs,
  type AuditActorType,
} from "@/lib/daysi-admin-api";
import { DAYSI_DEFAULT_LOCATION_SLUG } from "@/lib/daysi-public-api";

export function useDaysiAdminAuditLogs(input?: {
  locationSlug?: string;
  entityType?: string;
  actorType?: AuditActorType;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}) {
  const session = useDaysiAdminSession();
  const locationSlug = input?.locationSlug ?? DAYSI_DEFAULT_LOCATION_SLUG;

  return useQuery({
    queryKey: [
      "daysi-admin-audit-logs",
      locationSlug,
      input?.entityType,
      input?.actorType,
      input?.fromDate,
      input?.toDate,
      input?.limit,
      input?.offset,
    ],
    queryFn: async () =>
      listDaysiAdminAuditLogs({
        token: session.token!,
        locationSlug,
        entityType: input?.entityType,
        actorType: input?.actorType,
        fromDate: input?.fromDate,
        toDate: input?.toDate,
        limit: input?.limit ?? 50,
        offset: input?.offset ?? 0,
      }),
    enabled: session.ready,
    staleTime: 10_000,
  });
}
