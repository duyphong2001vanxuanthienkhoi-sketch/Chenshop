// Postgres access for Chen Shop.
// - Production / Vercel: Neon (DATABASE_URL), over HTTP via @neondatabase/serverless.
// - Local machine without DATABASE_URL: an embedded Postgres (PGlite) stored in .local-data/,
//   so the shop can be tried without creating any cloud resources.
import { SCHEMA } from "./schema";

export type Row = Record<string, unknown>;
type Runner = {
  query: (text: string, params?: unknown[]) => Promise<Row[]>;
  batch: (items: { text: string; params?: unknown[] }[]) => Promise<void>;
};

const globalStore = globalThis as unknown as { __chenDb?: Promise<Runner> };

function normalize(rows: Row[]): Row[] {
  // BIGINT columns may come back as bigint (PGlite); JSON cannot serialize those.
  for (const row of rows) for (const k in row) if (typeof row[k] === "bigint") row[k] = Number(row[k]);
  return rows;
}

async function createRunner(): Promise<Runner> {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  let runner: Runner;
  if (url) {
    const { neon } = await import("@neondatabase/serverless");
    const sql = neon(url);
    runner = {
      query: async (text, params = []) => normalize((await sql.query(text, params)) as Row[]),
      batch: async (items) => {
        if (items.length) await sql.transaction(items.map((i) => sql.query(i.text, i.params ?? [])));
      },
    };
  } else {
    if (process.env.VERCEL) {
      throw new Error("Chưa cấu hình DATABASE_URL. Hãy kết nối Neon trong Vercel → Storage.");
    }
    // Local fallback only. The module name is hidden from the bundler on purpose.
    const moduleName = "@electric-sql/pglite";
    const { PGlite } = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ moduleName);
    const { mkdir } = await import("node:fs/promises");
    await mkdir(process.cwd() + "/.local-data", { recursive: true });
    const db = new PGlite(process.cwd() + "/.local-data/pglite");
    runner = {
      query: async (text, params = []) => normalize((await db.query(text, params)).rows as Row[]),
      batch: async (items) => {
        await db.transaction(async (tx: { query: (t: string, p?: unknown[]) => Promise<unknown> }) => {
          for (const i of items) await tx.query(i.text, i.params ?? []);
        });
      },
    };
  }
  await runner.batch(SCHEMA.map((text) => ({ text })));
  return runner;
}

function runner(): Promise<Runner> {
  if (!globalStore.__chenDb) {
    globalStore.__chenDb = createRunner().catch((error) => {
      globalStore.__chenDb = undefined;
      throw error;
    });
  }
  return globalStore.__chenDb;
}

export async function query<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  return (await (await runner()).query(text, params)) as T[];
}

export async function queryOne<T = Row>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

export async function batch(items: { text: string; params?: unknown[] }[]): Promise<void> {
  await (await runner()).batch(items);
}
