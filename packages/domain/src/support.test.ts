import { describe, expect, it } from "vitest";

import { createSupportCase, updateSupportCase } from "./support";

describe("support", () => {
  it("creates a case and emits lifecycle events for status and assignment changes", () => {
    const created = createSupportCase({
      locationSlug: "daysi-flagship",
      subject: "Booking import mismatch",
      category: "imports",
      openedByUserId: "usr_admin_1",
      openedByEmail: "admin@daysi.ca",
      initialMessage: "Need help reconciling booking imports.",
      actorDisplayName: "Daysi Admin",
      now: "2026-03-08T14:00:00.000Z",
    });

    expect(created.supportCase.status).toBe("open");
    expect(created.initialEvent?.type).toBe("note");

    const updated = updateSupportCase({
      supportCase: created.supportCase,
      status: "in_progress",
      assignedToUserId: "usr_support_1",
      note: {
        body: "Investigating the import mapping now.",
        visibility: "internal",
      },
      actorUserId: "usr_admin_1",
      actorDisplayName: "Daysi Admin",
      now: "2026-03-08T14:10:00.000Z",
    });

    expect(updated.supportCase.status).toBe("in_progress");
    expect(updated.supportCase.assignedToUserId).toBe("usr_support_1");
    expect(updated.events).toHaveLength(3);
    expect(updated.events.map((event) => event.type)).toEqual([
      "status_changed",
      "assignment_changed",
      "internal_note",
    ]);
  });
});
