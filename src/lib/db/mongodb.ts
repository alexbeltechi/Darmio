/**
 * MongoDB Connection
 * 
 * Singleton connection pattern for Next.js
 * Handles connection pooling and reuse in serverless environment
 */

import { MongoClient, Db, type Document } from "mongodb";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";
import { PROJECT_HEADER } from "@/lib/cms/projects";

const options = {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  maxPoolSize: 10, // Limit connection pool size
  minPoolSize: 1, // Keep at least 1 connection alive
  maxIdleTimeMS: 10000, // Close idle connections after 10s
  retryWrites: true, // Retry failed writes
  retryReads: true, // Retry failed reads
};

let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

// Global variable to preserve connection across HMR in development
const globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient> | null;
};

function getMongoURI(): string {
  if (!process.env.MONGODB_URI) {
    // Worded so isDatabaseError and handleDatabaseError recognise it (lib/api/error-handler.ts).
    throw new Error("MONGODB_URI is required: this install has no database yet");
  }
  return process.env.MONGODB_URI;
}

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getMongoURI();

  // In development, use global variable to preserve connection across HMR
  if (process.env.NODE_ENV === "development") {
    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    return globalWithMongo._mongoClientPromise;
  }

  // In production, create a new client for each request
  if (!clientPromise) {
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
  return clientPromise;
}

/**
 * The hub's database name: MONGODB_DB when set (a hosting integration's
 * connection string often names none, and is managed by the integration),
 * else the one in the connection string.
 */
export function hubDbName(): string | undefined {
  return process.env.MONGODB_DB?.trim() || undefined;
}

/**
 * The hub: the database named by MONGODB_DB or the connection string. It
 * holds the account (users) and the list of projects; with one project, that
 * project's content too. See lib/db/projects.ts.
 */
export async function getHubDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(hubDbName());
}

/** A project as the hub stores it; `dbName` is where its content lives. */
export type ProjectRow = { id: string; slug: string; name: string; dbName: string; brain?: string; createdAt: string };

// Short, because each server instance (and, in dev, each route) keeps its own copy:
// a project added through one is seen by the others within seconds.
const PROJECTS_TTL_MS = 5_000;
let projectsCache: { at: number; rows: ProjectRow[] } | null = null;

/** Forget the cached project list, after one is added or changed. */
export function forgetProjects() {
  projectsCache = null;
}

/**
 * Every project, oldest first (the first is the default). Empty for an
 * install from before projects. `fresh` skips the cache, for anything that
 * lists, switches or changes projects.
 */
export async function hubProjects({ fresh = false }: { fresh?: boolean } = {}): Promise<ProjectRow[]> {
  if (!fresh && projectsCache && Date.now() - projectsCache.at < PROJECTS_TTL_MS) return projectsCache.rows;
  const db = await getHubDb();
  const docs = await db.collection(Collections.PROJECTS).find({}).sort({ createdAt: 1 }).toArray();
  const rows = docs.map((doc) => withoutId<ProjectRow>(doc));
  projectsCache = { at: Date.now(), rows };
  return rows;
}

/** The project slug the request asked for, if this is a request at all (scripts aren't). */
async function requestedProjectSlug(): Promise<string | null> {
  try {
    return (await headers()).get(PROJECT_HEADER);
  } catch (error) {
    unstable_rethrow(error);
    return null;
  }
}

/**
 * The project this request is for: the one the admin or an agent picked,
 * else the first. Only an install with several projects reads the request,
 * so single-project sites keep their static pages. Null before projects.
 */
export async function getCurrentProject(): Promise<ProjectRow | null> {
  const projects = await hubProjects();
  if (projects.length === 0) return null;
  if (projects.length === 1) return projects[0];
  const slug = await requestedProjectSlug();
  return projects.find((p) => p.slug === slug) ?? projects[0];
}

/**
 * The current project's database: everything but the account and the
 * project list lives here (posts, media, categories, settings, keys…).
 */
export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  const project = await getCurrentProject();
  return project ? client.db(project.dbName) : client.db(hubDbName());
}

/**
 * Collection names
 */
export const Collections = {
  ENTRIES: "entries",
  MEDIA: "media",
  CATEGORIES: "categories",
  USERS: "users",
  SETTINGS: "settings",
  INTEGRATIONS: "integrations",
  ACTIVITY: "activity",
  DOCS: "docs",
  WIREFRAMES: "wireframes",
  /** In the hub only. */
  PROJECTS: "projects",
} as const;

/**
 * A stored document as the app's type, without Mongo's `_id` (the app uses its
 * own `id`, and `_id` doesn't serialise to client components). Every read in
 * lib/db goes through this.
 */
export function withoutId<T>(doc: Document): T;
export function withoutId<T>(doc: Document | null): T | null;
export function withoutId<T>(doc: Document | null): T | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return rest as T;
}
