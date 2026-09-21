/**
 * Local, browser-only replacement for the previous cloud client.
 *
 * The public surface stays identical (`supabase.from(...)`, `supabase.storage`,
 * `supabase.auth`) so every page keeps working unchanged — but all data now
 * lives in the visitor's own browser.
 */
import {
  getFile,
  localUser,
  putFile,
  readTable,
  removeFiles,
  writeTable,
  type Row,
} from "@/lib/browser-store";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Result<T> = { data: any; error: { message: string } | null };

const uuid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

function withDefaults(table: string, row: Record<string, unknown>): Row {
  const now = new Date().toISOString();
  const base: Record<string, unknown> = {
    id: uuid(),
    created_at: now,
    updated_at: now,
    user_id: localUser().id,
  };
  if (table === "generated_images") base["is_public"] = false;
  return { ...base, ...row } as Row;
}

type Filter = { column: string; value: unknown };

class Query<T> implements PromiseLike<Result<T>> {
  private filters: Filter[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;
  private mode: "select" | "insert" | "update" | "delete" | "upsert" = "select";
  private payload: Row[] = [];
  private conflict: string[] = [];
  private returnSingle: "none" | "single" | "maybe" = "none";
  private done = false;

  /**
   * Writes must land even when the caller never awaits the chain, so they run
   * on the next microtask once the whole chain (filters included) is built.
   */
  private scheduleWrite() {
    queueMicrotask(() => {
      if (!this.done) {
        try {
          this.run();
        } catch {
          /* ignore */
        }
      }
    });
  }

  constructor(private table: string) {}

  select(_columns?: string) {
    if (this.mode === "select") this.mode = "select";
    return this as unknown as Query<Row[]>;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.max = count;
    return this;
  }

  single() {
    this.returnSingle = "single";
    return this as unknown as Query<Row>;
  }

  maybeSingle() {
    this.returnSingle = "maybe";
    return this as unknown as Query<Row | null>;
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]) {
    this.mode = "insert";
    this.payload = (Array.isArray(values) ? values : [values]).map((row) => withDefaults(this.table, row));
    this.scheduleWrite();
    return this;
  }

  upsert(values: Record<string, unknown> | Record<string, unknown>[], options?: { onConflict?: string }) {
    this.mode = "upsert";
    this.conflict = (options?.onConflict ?? "id").split(",").map((part) => part.trim());
    this.payload = (Array.isArray(values) ? values : [values]).map((row) => withDefaults(this.table, row));
    this.scheduleWrite();
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.mode = "update";
    this.payload = [patch as Row];
    this.scheduleWrite();
    return this;
  }

  delete() {
    this.mode = "delete";
    this.scheduleWrite();
    return this;
  }

  private matches(row: Row) {
    return this.filters.every((filter) => row[filter.column] === filter.value);
  }

  private run(): Result<unknown> {
    this.done = true;
    let rows = readTable(this.table);

    // The local profile row is created on first use so the account page works.
    if (this.table === "profiles" && rows.length === 0) {
      rows = [
        withDefaults("profiles", {
          id: localUser().id,
          username: "",
          display_name: "",
          avatar_url: null,
          tokens_used: 0,
        }),
      ];
      writeTable("profiles", rows);
    }

    if (this.mode === "insert" || this.mode === "upsert") {
      let next = rows;
      const created: Row[] = [];
      for (const row of this.payload) {
        if (this.mode === "upsert") {
          const index = next.findIndex((existing) =>
            this.conflict.every((column) => existing[column] === row[column]),
          );
          if (index >= 0) {
            const merged = { ...next[index], ...row, id: next[index]!["id"] } as Row;
            next = next.map((existing, i) => (i === index ? merged : existing));
            created.push(merged);
            continue;
          }
        }
        next = [...next, row];
        created.push(row);
      }
      writeTable(this.table, next);
      return this.shape(created);
    }

    if (this.mode === "update") {
      const patch = this.payload[0] ?? {};
      const updated: Row[] = [];
      const next = rows.map((row) => {
        if (!this.matches(row)) return row;
        const merged = { ...row, ...patch } as Row;
        updated.push(merged);
        return merged;
      });
      writeTable(this.table, next);
      return this.shape(updated);
    }

    if (this.mode === "delete") {
      const removed = rows.filter((row) => this.matches(row));
      writeTable(
        this.table,
        rows.filter((row) => !this.matches(row)),
      );
      return this.shape(removed);
    }

    let found = rows.filter((row) => this.matches(row));
    if (this.orderBy) {
      const { column, ascending } = this.orderBy;
      found = [...found].sort((a, b) => {
        const left = String(a[column] ?? "");
        const right = String(b[column] ?? "");
        return ascending ? left.localeCompare(right) : right.localeCompare(left);
      });
    }
    if (this.max != null) found = found.slice(0, this.max);
    return this.shape(found);
  }

  private shape(rows: Row[]): Result<unknown> {
    if (this.returnSingle === "single") {
      const first = rows[0];
      return first
        ? { data: first, error: null }
        : { data: null, error: { message: "No rows found" } };
    }
    if (this.returnSingle === "maybe") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  then<TResult1 = Result<T>, TResult2 = never>(
    onfulfilled?: ((value: Result<T>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    let result: Result<T>;
    try {
      result = this.run() as Result<T>;
    } catch (error) {
      return Promise.resolve({
        data: null,
        error: { message: error instanceof Error ? error.message : String(error) },
      } as Result<T>).then(onfulfilled, onrejected);
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }
}

function storageBucket(bucket: string) {
  const key = (path: string) => `${bucket}/${path}`;
  return {
    async upload(path: string, blob: Blob, _options?: unknown) {
      try {
        await putFile(key(path), blob);
        return { data: { path }, error: null };
      } catch (error) {
        return {
          data: null,
          error: { message: error instanceof Error ? error.message : "Could not save the image" },
        };
      }
    },
    async createSignedUrl(path: string, _expiresIn?: number) {
      const dataUrl = await getFile(key(path));
      return { data: dataUrl ? { signedUrl: dataUrl } : null, error: null as { message: string } | null };
    },
    getPublicUrl(path: string) {
      return { data: { publicUrl: key(path) } };
    },
    async remove(paths: string[]) {
      await removeFiles(paths.map(key));
      return { data: null, error: null as { message: string } | null };
    },
  };
}

const noopAuth = {
  async getSession() {
    return { data: { session: { user: localUser() } }, error: null };
  },
  async getUser() {
    return { data: { user: localUser() }, error: null };
  },
  onAuthStateChange(_callback: unknown) {
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signOut(_options?: unknown) {
    return { error: null };
  },
  async updateUser(_attributes: unknown) {
    return { data: { user: localUser() }, error: null };
  },
  async setSession(_tokens: unknown) {
    return { data: { session: null }, error: null };
  },
};

export const supabase = {
  from: (table: string) => new Query<Row[]>(table),
  storage: { from: storageBucket },
  auth: noopAuth,
};
