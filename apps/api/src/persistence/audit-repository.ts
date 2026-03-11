export type AuditActorType = "admin" | "staff" | "customer" | "system";

export interface AuditActor {
  type: AuditActorType;
  email: string;
  name: string;
  userId?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string;
  summary: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  locationSlug?: string;
}

export interface AuditListOptions {
  limit?: number;
  offset?: number;
  entityType?: string;
  actorType?: AuditActorType;
  fromDate?: string;
  toDate?: string;
  locationSlug?: string;
}

type Awaitable<T> = T | Promise<T>;

export interface AuditRepository {
  save(entry: AuditLogEntry): Awaitable<void>;
  list(options?: AuditListOptions): Awaitable<{ entries: AuditLogEntry[]; total: number }>;
  listAll(): Awaitable<AuditLogEntry[]>;
}

const auditLogs: AuditLogEntry[] = [];

export const createInMemoryAuditRepository = (): AuditRepository => ({
  save: (entry) => {
    auditLogs.push(entry);
    // Keep only last 10000 entries to prevent memory issues
    if (auditLogs.length > 10000) {
      auditLogs.shift();
    }
  },
  list: (options = {}) => {
    let filtered = [...auditLogs];
    
    if (options.locationSlug) {
      filtered = filtered.filter(e => e.locationSlug === options.locationSlug);
    }
    if (options.entityType) {
      filtered = filtered.filter(e => e.entityType === options.entityType);
    }
    if (options.actorType) {
      filtered = filtered.filter(e => e.actor.type === options.actorType);
    }
    if (options.fromDate) {
      filtered = filtered.filter(e => e.timestamp >= options.fromDate!);
    }
    if (options.toDate) {
      filtered = filtered.filter(e => e.timestamp <= options.toDate!);
    }
    
    // Sort by timestamp descending
    filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    const total = filtered.length;
    const offset = options.offset ?? 0;
    const limit = options.limit ?? 50;
    const entries = filtered.slice(offset, offset + limit);
    
    return { entries, total };
  },
  listAll: () => [...auditLogs].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ),
});
