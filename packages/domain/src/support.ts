import { randomUUID } from "node:crypto";

export type SupportCaseStatus =
  | "open"
  | "in_progress"
  | "waiting_on_customer"
  | "resolved"
  | "closed";

export type SupportCasePriority = "low" | "normal" | "high" | "urgent";

export type SupportCaseEventType =
  | "note"
  | "internal_note"
  | "status_changed"
  | "assignment_changed";

export type SupportCaseEventVisibility = "internal" | "tenant";

export interface SupportCase {
  id: string;
  locationSlug: string;
  subject: string;
  category: string;
  priority: SupportCasePriority;
  status: SupportCaseStatus;
  openedByUserId?: string;
  openedByEmail?: string;
  assignedToUserId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface SupportCaseEvent {
  id: string;
  supportCaseId: string;
  locationSlug: string;
  type: SupportCaseEventType;
  visibility: SupportCaseEventVisibility;
  body: string;
  metadata: Record<string, unknown>;
  createdByUserId?: string;
  createdByDisplayName?: string;
  createdAt: string;
}

export const createSupportCase = (input: {
  locationSlug: string;
  subject: string;
  category: string;
  priority?: SupportCasePriority;
  openedByUserId?: string;
  openedByEmail?: string;
  tags?: string[];
  initialMessage?: string;
  initialVisibility?: SupportCaseEventVisibility;
  actorDisplayName?: string;
  now?: string;
}): { supportCase: SupportCase; initialEvent?: SupportCaseEvent } => {
  const now = input.now ?? new Date().toISOString();
  const supportCase: SupportCase = {
    id: `scase_${randomUUID()}`,
    locationSlug: input.locationSlug,
    subject: input.subject,
    category: input.category,
    priority: input.priority ?? "normal",
    status: "open",
    openedByUserId: input.openedByUserId,
    openedByEmail: input.openedByEmail?.toLowerCase(),
    tags: input.tags ?? [],
    createdAt: now,
    updatedAt: now,
  };

  const initialEvent = input.initialMessage
    ? createSupportCaseEvent({
        supportCase,
        type: "note",
        visibility: input.initialVisibility ?? "internal",
        body: input.initialMessage,
        createdByUserId: input.openedByUserId,
        createdByDisplayName: input.actorDisplayName,
        now,
      })
    : undefined;

  return {
    supportCase,
    initialEvent,
  };
};

export const createSupportCaseEvent = (input: {
  supportCase: SupportCase;
  type: SupportCaseEventType;
  visibility: SupportCaseEventVisibility;
  body: string;
  metadata?: Record<string, unknown>;
  createdByUserId?: string;
  createdByDisplayName?: string;
  now?: string;
}): SupportCaseEvent => ({
  id: `scevt_${randomUUID()}`,
  supportCaseId: input.supportCase.id,
  locationSlug: input.supportCase.locationSlug,
  type: input.type,
  visibility: input.visibility,
  body: input.body,
  metadata: input.metadata ?? {},
  createdByUserId: input.createdByUserId,
  createdByDisplayName: input.createdByDisplayName,
  createdAt: input.now ?? new Date().toISOString(),
});

export const updateSupportCase = (input: {
  supportCase: SupportCase;
  status?: SupportCaseStatus;
  priority?: SupportCasePriority;
  assignedToUserId?: string | null;
  tags?: string[];
  actorUserId?: string;
  actorDisplayName?: string;
  note?: {
    body: string;
    visibility: SupportCaseEventVisibility;
  };
  now?: string;
}): { supportCase: SupportCase; events: SupportCaseEvent[] } => {
  const now = input.now ?? new Date().toISOString();
  const events: SupportCaseEvent[] = [];

  if (input.status && input.status !== input.supportCase.status) {
    events.push(
      createSupportCaseEvent({
        supportCase: input.supportCase,
        type: "status_changed",
        visibility: "internal",
        body: `Status changed from ${input.supportCase.status} to ${input.status}`,
        metadata: {
          fromStatus: input.supportCase.status,
          toStatus: input.status,
        },
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        now,
      }),
    );
  }

  if (
    input.assignedToUserId !== undefined &&
    input.assignedToUserId !== input.supportCase.assignedToUserId
  ) {
    events.push(
      createSupportCaseEvent({
        supportCase: input.supportCase,
        type: "assignment_changed",
        visibility: "internal",
        body: input.assignedToUserId
          ? `Assigned to ${input.assignedToUserId}`
          : "Assignment cleared",
        metadata: {
          previousAssignedToUserId: input.supportCase.assignedToUserId,
          assignedToUserId: input.assignedToUserId ?? null,
        },
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        now,
      }),
    );
  }

  if (input.note) {
    events.push(
      createSupportCaseEvent({
        supportCase: input.supportCase,
        type: input.note.visibility === "internal" ? "internal_note" : "note",
        visibility: input.note.visibility,
        body: input.note.body,
        createdByUserId: input.actorUserId,
        createdByDisplayName: input.actorDisplayName,
        now,
      }),
    );
  }

  const nextStatus = input.status ?? input.supportCase.status;

  return {
    supportCase: {
      ...input.supportCase,
      status: nextStatus,
      priority: input.priority ?? input.supportCase.priority,
      assignedToUserId:
        input.assignedToUserId !== undefined
          ? input.assignedToUserId ?? undefined
          : input.supportCase.assignedToUserId,
      tags: input.tags ?? input.supportCase.tags,
      updatedAt: now,
      resolvedAt:
        nextStatus === "resolved" || nextStatus === "closed"
          ? input.supportCase.resolvedAt ?? now
          : undefined,
    },
    events,
  };
};
