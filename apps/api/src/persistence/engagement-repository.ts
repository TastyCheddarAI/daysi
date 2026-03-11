import type {
  CustomerEventRecord,
  CustomerNote,
  CustomerTag,
  WaitlistEntryRecord,
} from "../../../../packages/domain/src";

import {
  deleteCustomerTag,
  getCustomerNote,
  getCustomerTag,
  getStoredWaitlistEntry,
  listAllWaitlistEntries,
  listCustomerEvents,
  listCustomerNotes,
  listCustomerTags,
  listWaitlistEntriesForActor,
  saveCustomerEvent,
  saveCustomerNote,
  saveCustomerTag,
  saveWaitlistEntry,
  updateCustomerNote,
  updateWaitlistEntry,
} from "../bootstrap-store";

type Awaitable<T> = T | Promise<T>;

export interface StoredWaitlistEntryRecord {
  waitlistEntry: WaitlistEntryRecord;
  managementToken: string;
}

export interface EngagementRepository {
  customerEvents: {
    save(event: CustomerEventRecord): Awaitable<void>;
    listAll(): Awaitable<CustomerEventRecord[]>;
  };
  customerNotes: {
    save(note: CustomerNote): Awaitable<void>;
    update(note: CustomerNote): Awaitable<void>;
    get(noteId: string): Awaitable<CustomerNote | undefined>;
    listAll(): Awaitable<CustomerNote[]>;
  };
  customerTags: {
    save(tag: CustomerTag): Awaitable<void>;
    get(tagId: string): Awaitable<CustomerTag | undefined>;
    delete(tagId: string): Awaitable<void>;
    listAll(): Awaitable<CustomerTag[]>;
  };
  waitlist: {
    save(waitlistEntry: WaitlistEntryRecord, managementToken: string): Awaitable<void>;
    update(waitlistEntry: WaitlistEntryRecord): Awaitable<void>;
    getStored(
      waitlistEntryId: string,
    ): Awaitable<StoredWaitlistEntryRecord | undefined>;
    listAll(): Awaitable<WaitlistEntryRecord[]>;
    listForActor(input: {
      actorUserId?: string;
      actorEmail?: string;
    }): Awaitable<WaitlistEntryRecord[]>;
  };
}

export const createInMemoryEngagementRepository = (): EngagementRepository => ({
  customerEvents: {
    save: (event) => {
      saveCustomerEvent(event);
    },
    listAll: listCustomerEvents,
  },
  customerNotes: {
    save: (note) => {
      saveCustomerNote(note);
    },
    update: (note) => {
      updateCustomerNote(note);
    },
    get: getCustomerNote,
    listAll: listCustomerNotes,
  },
  customerTags: {
    save: (tag) => {
      saveCustomerTag(tag);
    },
    get: getCustomerTag,
    delete: (tagId) => {
      deleteCustomerTag(tagId);
    },
    listAll: listCustomerTags,
  },
  waitlist: {
    save: (waitlistEntry, managementToken) => {
      saveWaitlistEntry(waitlistEntry, managementToken);
    },
    update: (waitlistEntry) => {
      updateWaitlistEntry(waitlistEntry);
    },
    getStored: getStoredWaitlistEntry,
    listAll: listAllWaitlistEntries,
    listForActor: listWaitlistEntriesForActor,
  },
});
