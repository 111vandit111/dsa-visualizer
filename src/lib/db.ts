import { MongoClient, type Db } from "mongodb";
import { getMongoEnv } from "@/lib/env";

export const QUESTIONS_COLLECTION = "questions";
const SERVER_SELECTION_TIMEOUT_MS = 5000;

interface MongoCache {
  client?: MongoClient;
  ready?: Promise<Db>;
}

// Cached on globalThis so dev-server hot reloads reuse one connection pool.
const globalCache = globalThis as typeof globalThis & { __dsaMongo?: MongoCache };
const cache: MongoCache = (globalCache.__dsaMongo ??= {});

export async function ensureIndexes(db: Db): Promise<void> {
  const questions = db.collection(QUESTIONS_COLLECTION);
  await Promise.all([
    questions.createIndex({ slug: 1 }, { unique: true }),
    questions.createIndex({ difficulty: 1 }),
    questions.createIndex({ kind: 1 }),
    questions.createIndex({ tags: 1 }),
    questions.createIndex({ updatedAt: -1 }),
  ]);
}

async function connect(): Promise<Db> {
  const client = new MongoClient(getMongoEnv().MONGODB_URI, {
    serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT_MS,
  });
  cache.client = client;
  const db = (await client.connect()).db();
  await ensureIndexes(db);
  return db;
}

export function getDb(): Promise<Db> {
  if (!cache.ready) {
    cache.ready = connect().catch(async (error: unknown) => {
      await closeDb();
      throw error;
    });
  }
  return cache.ready;
}

export async function closeDb(): Promise<void> {
  const client = cache.client;
  cache.client = undefined;
  cache.ready = undefined;
  await client?.close();
}
