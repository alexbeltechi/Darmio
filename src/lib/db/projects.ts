/**
 * The hub's project list. Each project's content lives in its own database
 * on the same cluster: the first in the hub's own database (so an install
 * from before projects keeps its data where it is), the rest in
 * `<hub>-<slug>`. A project can move to its own cluster later; only `dbName`
 * (and a connection string) would change.
 */
import { Collections, forgetProjects, getHubDb, getMongoClient, hubProjects, withoutId, type ProjectRow } from "@/lib/db/mongodb";
import { SETTINGS_KEY } from "@/lib/db/settings";
import { parseBrain, parseProjectName, PROJECTS_MAX, type ProjectSummary } from "@/lib/cms/projects";
import { slugify } from "@/lib/slug";

export const toSummary = ({ slug, name, brain }: ProjectRow): ProjectSummary => ({ slug, name, ...(brain ? { brain } : {}) });

/** Where a project's changes are dated: posts and pages, the library, documents, categories, settings. */
const DATED = [Collections.ENTRIES, Collections.MEDIA, Collections.DOCS, Collections.CATEGORIES, Collections.SETTINGS];

/**
 * When anything in a project last changed: the newest `updatedAt` across its
 * content (or a media item's `createdAt`), else when the project was made.
 * A handful of one-row reads per project, for Home's cards.
 */
export async function lastChangeOf(row: ProjectRow): Promise<string> {
  // A project whose database can't be read still lists, dated when it was made.
  try {
    return await newestChange(row);
  } catch {
    return row.createdAt;
  }
}

async function newestChange(row: ProjectRow): Promise<string> {
  const db = (await getMongoClient()).db(row.dbName);
  const newest = await Promise.all(
    DATED.flatMap((name) =>
      ["updatedAt", "createdAt"].map((field) =>
        db
          .collection(name)
          .find({ [field]: { $type: "string" } }, { projection: { [field]: 1 } })
          .sort({ [field]: -1 })
          .limit(1)
          .next()
          .then((doc) => (doc?.[field] as string | undefined) ?? "")
      )
    )
  );
  return newest.reduce((latest, at) => (at > latest ? at : latest), row.createdAt);
}

// MongoDB Atlas refuses database names over 38 bytes (it said so when a long
// project name was tried, 2026-10-26).
const DB_NAME_MAX = 38;

/**
 * A project's database: the hub's name and the project's slug
 * (`darmio-y3k-club`), cut short with a bit of the project's id when that
 * runs past Atlas's limit, so it stays unique.
 */
function projectDbName(hubName: string, slug: string, id: string): string {
  const full = `${hubName}-${slug}`;
  if (full.length <= DB_NAME_MAX) return full;
  const suffix = `-${id.replace(/-/g, "").slice(0, 6)}`;
  return `${full.slice(0, DB_NAME_MAX - suffix.length).replace(/-+$/, "")}${suffix}`;
}

async function freeSlug(name: string, taken: Set<string>): Promise<string> {
  const base = slugify(name).slice(0, 40) || "project";
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/**
 * Add a project. The first goes in the hub's own database; the rest each get
 * a new one. Its site settings start with the project's name.
 */
export async function createProject(input: { name: unknown; brain?: unknown }): Promise<ProjectRow> {
  const name = parseProjectName(input.name);
  const brain = parseBrain(input.brain);
  const existing = await hubProjects({ fresh: true });
  if (existing.length >= PROJECTS_MAX) throw new Error(`An install holds at most ${PROJECTS_MAX} projects`);

  const hub = await getHubDb();
  const slug = await freeSlug(name, new Set(existing.map((p) => p.slug)));
  const id = crypto.randomUUID();
  const dbName = existing.length === 0 ? hub.databaseName : projectDbName(hub.databaseName, slug, id);
  const row: ProjectRow = { id, slug, name, dbName, ...(brain ? { brain } : {}), createdAt: new Date().toISOString() };

  // Its database first: if the server refuses it, no project is listed that can't open.
  const client = await getMongoClient();
  await client
    .db(dbName)
    .collection(Collections.SETTINGS)
    .updateOne(
      { key: SETTINGS_KEY },
      { $setOnInsert: { key: SETTINGS_KEY, siteName: name, updatedAt: row.createdAt } },
      { upsert: true }
    );
  await hub.collection(Collections.PROJECTS).insertOne({ ...row });
  forgetProjects();
  return row;
}

/**
 * An install from before projects has its content in the hub's database and
 * no project list. Register that content as its first project (named after
 * its site), so a second can be added beside it.
 */
export async function ensureFirstProject(): Promise<void> {
  if ((await hubProjects({ fresh: true })).length > 0) return;
  const hub = await getHubDb();
  const settings = await hub.collection(Collections.SETTINGS).findOne({ key: SETTINGS_KEY });
  await createProject({ name: (settings?.siteName as string) || "My site" });
}

/** Rename a project or change its brain. */
export async function updateProject(slug: string, updates: { name?: unknown; brain?: unknown }): Promise<ProjectRow> {
  const set: Record<string, unknown> = {};
  if (updates.name !== undefined) set.name = parseProjectName(updates.name);
  const unset: Record<string, ""> = {};
  if (updates.brain !== undefined) {
    const brain = parseBrain(updates.brain);
    if (brain) set.brain = brain;
    else unset.brain = "";
  }
  const hub = await getHubDb();
  if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
    const row = (await hubProjects({ fresh: true })).find((p) => p.slug === slug);
    if (!row) throw new Error(`No project "${slug}"`);
    return row;
  }
  const result = await hub
    .collection(Collections.PROJECTS)
    .findOneAndUpdate({ slug }, { ...(Object.keys(set).length ? { $set: set } : {}), ...(Object.keys(unset).length ? { $unset: unset } : {}) }, { returnDocument: "after" });
  if (!result) throw new Error(`No project "${slug}"`);
  forgetProjects();
  return withoutId<ProjectRow>(result);
}
