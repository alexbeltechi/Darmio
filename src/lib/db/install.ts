/**
 * What an install runs on and how much of it the projects use (decisions,
 * 2026-10-27): the hosting, the MongoDB cluster and the image storage. All
 * three are set up once, for the whole install; every project shares them.
 * Read-only: nothing here changes a plan or a setting.
 */
import { getMongoClient, getHubDb, hubProjects } from "@/lib/db/mongodb";
import { mediaStorageUsage } from "@/lib/db/media";
import { shouldUseBlob } from "@/lib/cms/blob-storage";
import { PROJECTS_MAX } from "@/lib/cms/projects";

/** MongoDB Atlas's free cluster (M0) holds 512 MB. */
export const ATLAS_FREE_BYTES = 512 * 1024 ** 2;
/** Vercel Blob's free (Hobby) plan holds 1 GB. */
export const BLOB_FREE_BYTES = 1024 ** 3;

export type ProjectUse = { name: string; bytes: number };

export type InstallUsage = {
  hosting: {
    provider: "vercel" | "local";
    /** The production address, e.g. darmio-test.vercel.app. */
    address: string | null;
    /** The GitHub repo it deploys from, e.g. alexbeltechi/darmio-test. */
    repo: string | null;
    environment: string | null;
    region: string | null;
  };
  database: {
    /** The cluster's host, e.g. cluster0.abcd.mongodb.net: no user or password. */
    host: string | null;
    atlas: boolean;
    totalBytes: number;
    freeBytes: number;
    projects: ProjectUse[];
  };
  storage: {
    provider: "vercel-blob" | "local";
    totalBytes: number;
    items: number;
    freeBytes: number;
    projects: ProjectUse[];
  };
  projectCount: number;
  projectsMax: number;
};

/** The cluster's host from the connection string, without the user and password in it. */
function clusterHost(): string | null {
  const uri = process.env.MONGODB_URI ?? "";
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/(?:[^@/]*@)?([^/?,]+)/);
  return match ? match[1] : null;
}

/** A database's size as Atlas counts it towards a plan: its data plus its indexes. */
async function databaseBytes(name: string): Promise<number> {
  try {
    const client = await getMongoClient();
    const stats = await client.db(name).command({ dbStats: 1 });
    return Number(stats.dataSize ?? 0) + Number(stats.indexSize ?? 0);
  } catch {
    return 0;
  }
}

export async function installUsage(): Promise<InstallUsage> {
  const client = await getMongoClient();
  const hub = await getHubDb();
  const projects = await hubProjects({ fresh: true });

  // The hub holds the accounts and the project list, and the first project's content too.
  const rows = projects.length ? projects : [];
  const databases = await Promise.all(rows.map(async (row) => ({ name: row.name, bytes: await databaseBytes(row.dbName) })));
  const hubCounted = rows.some((row) => row.dbName === hub.databaseName);
  const hubBytes = hubCounted ? 0 : await databaseBytes(hub.databaseName);

  const libraries = await Promise.all(
    rows.map(async (row) => ({ name: row.name, usage: await mediaStorageUsage(client.db(row.dbName)) }))
  );

  const host = clusterHost();
  const onVercel = process.env.VERCEL === "1";
  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const slug = process.env.VERCEL_GIT_REPO_SLUG;

  return {
    hosting: {
      provider: onVercel ? "vercel" : "local",
      address: process.env.VERCEL_PROJECT_PRODUCTION_URL ?? null,
      repo: owner && slug ? `${owner}/${slug}` : null,
      environment: process.env.VERCEL_ENV ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    database: {
      host,
      atlas: Boolean(host?.endsWith(".mongodb.net")),
      totalBytes: databases.reduce((sum, d) => sum + d.bytes, hubBytes),
      freeBytes: ATLAS_FREE_BYTES,
      projects: databases,
    },
    storage: {
      provider: shouldUseBlob() ? "vercel-blob" : "local",
      totalBytes: libraries.reduce((sum, l) => sum + l.usage.bytes, 0),
      items: libraries.reduce((sum, l) => sum + l.usage.items, 0),
      freeBytes: BLOB_FREE_BYTES,
      projects: libraries.map((l) => ({ name: l.name, bytes: l.usage.bytes })),
    },
    projectCount: projects.length,
    projectsMax: PROJECTS_MAX,
  };
}
