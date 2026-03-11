export type ImportJobType = "customers" | "services" | "bookings" | "memberships" | "products";

export type ImportJobStatus = 
  | "pending" 
  | "validating" 
  | "validated" 
  | "processing" 
  | "completed" 
  | "failed";

export interface ImportJobError {
  row: number;
  message: string;
}

export interface ImportJob {
  id: string;
  locationSlug: string;
  type: ImportJobType;
  status: ImportJobStatus;
  fileName: string;
  rowCount: number;
  processedCount: number;
  successCount: number;
  errorCount: number;
  errors: ImportJobError[];
  createdAt: string;
  completedAt?: string;
  metadata: Record<string, unknown>;
  createdByUserId?: string;
}

type Awaitable<T> = T | Promise<T>;

export interface ImportRepository {
  save(job: ImportJob): Awaitable<void>;
  get(id: string): Awaitable<ImportJob | undefined>;
  listByLocation(locationSlug: string): Awaitable<ImportJob[]>;
  listAll(): Awaitable<ImportJob[]>;
  delete(id: string): Awaitable<void>;
}

const importJobs = new Map<string, ImportJob>();

export const createInMemoryImportRepository = (): ImportRepository => ({
  save: (job) => {
    importJobs.set(job.id, job);
  },
  get: (id) => importJobs.get(id),
  listByLocation: (locationSlug) =>
    Array.from(importJobs.values())
      .filter((job) => job.locationSlug === locationSlug)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  listAll: () =>
    Array.from(importJobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    ),
  delete: (id) => {
    importJobs.delete(id);
  },
});
