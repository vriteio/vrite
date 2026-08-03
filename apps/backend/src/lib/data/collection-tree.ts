import { collections, type Collection } from "#backend/db";
import { toCollectionID } from "#backend/lib/primitives";
import { db } from "#backend/lib/adapters";
import { and, asc, eq, isNull } from "drizzle-orm";

type CollectionRow = typeof collections.$inferSelect;

const mapCollectionTree = (rows: CollectionRow[]): Collection[] => {
  const byID = new Map(rows.map((row) => [row.id, row]));
  const children = new Map<string, CollectionRow[]>();

  for (const row of rows) {
    if (!row.parentID) continue;
    const existing = children.get(row.parentID) || [];

    existing.push(row);
    children.set(row.parentID, existing);
  }

  return rows.map((row) => {
    const ancestors: string[] = [];
    let parent = row.parentID ? byID.get(row.parentID) : undefined;

    while (parent?.parentID) {
      ancestors.unshift(toCollectionID(parent.id));
      parent = byID.get(parent.parentID);
    }

    return {
      id: toCollectionID(row.id),
      name: row.name,
      ancestors,
      descendants: (children.get(row.id) || []).map((child) => toCollectionID(child.id))
    };
  });
};
const loadCollectionTree = async (workspaceID: string) => {
  const rows = await db
    .select()
    .from(collections)
    .where(and(eq(collections.workspaceID, workspaceID), isNull(collections.deletedAt)))
    .orderBy(asc(collections.rank), asc(collections.id));

  return { rows, collections: mapCollectionTree(rows) };
};

export { loadCollectionTree };
