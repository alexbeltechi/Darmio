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

// Atlas allows database names up to 64 characters.
const DB_NAME_MAX = 60;

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
  const dbName = existing.length === 0 ? hub.databaseName : `${hub.databaseName}-${slug}`.slice(0, DB_NAME_MAX);

  const row: ProjectRow = { id: crypto.randomUUID(), slug, name, dbName, ...(brain ? { brain } : {}), createdAt: new Date().toISOString() };
  await hub.collection(Collections.PROJECTS).insertOne({ ...row });
  forgetProjects();

  const client = await getMongoClient();
  await client
    .db(dbName)
    .collection(Collections.SETTINGS)
    .updateOne(
      { key: SETTINGS_KEY },
      { $setOnInsert: { key: SETTINGS_KEY, siteName: name, updatedAt: row.createdAt } },
      { upsert: true }
    );
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
