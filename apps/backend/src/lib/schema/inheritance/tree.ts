import type { collections } from "#backend/db";
import type { SchemaDefinitionSource } from "./resolver";

type CollectionRow = typeof collections.$inferSelect;

const getCollectionSubtreeIDs = (collectionID: string, rows: CollectionRow[]): string[] => {
  const childrenByParentID = new Map<string, string[]>();
  const collectionIDs = [collectionID];

  for (const row of rows) {
    if (!row.parentID) continue;

    const children = childrenByParentID.get(row.parentID) || [];

    children.push(row.id);
    childrenByParentID.set(row.parentID, children);
  }

  for (let index = 0; index < collectionIDs.length; index += 1) {
    collectionIDs.push(...(childrenByParentID.get(collectionIDs[index]) || []));
  }

  return collectionIDs;
};
const getCollectionSourceChain = (
  collectionID: string,
  collectionsByID: Map<string, CollectionRow>,
  sourcesByCollectionID: Map<string, SchemaDefinitionSource>
): SchemaDefinitionSource[] => {
  const collectionIDs: string[] = [];
  let current = collectionsByID.get(collectionID);

  while (current) {
    collectionIDs.unshift(current.id);
    current = current.parentID ? collectionsByID.get(current.parentID) : undefined;
  }

  return collectionIDs.flatMap((id) => {
    const source = sourcesByCollectionID.get(id);

    return source ? [source] : [];
  });
};

export { getCollectionSourceChain, getCollectionSubtreeIDs };
export type { CollectionRow };
