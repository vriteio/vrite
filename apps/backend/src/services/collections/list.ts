import { toCollectionID, toUUID } from "#backend/lib/primitives";
import { type Collection } from "#backend/db";
import { loadCollectionTree } from "#backend/lib/data";
import { ROOT_COLLECTION_NAME } from "#backend/lib/validation";

const listCollections = async (input: {
  workspaceID: string;
  ancestorID?: string;
  perPage?: number;
  page?: number;
}): Promise<{ collections: Collection[] }> => {
  const perPage = input.perPage || 50;
  const page = input.page || 1;
  const workspaceID = toUUID(input.workspaceID);
  const tree = await loadCollectionTree(workspaceID);
  const root = tree.rows.find((row) => row.parentID === null && row.name === ROOT_COLLECTION_NAME);
  const parentID = input.ancestorID ? toUUID(input.ancestorID) : root?.id;

  if (!parentID) return { collections: [] };

  const ids = tree.rows
    .filter((row) => row.parentID === parentID && row.name !== ROOT_COLLECTION_NAME)
    .slice((page - 1) * perPage, page * perPage)
    .map((row) => toCollectionID(row.id));
  const selected = new Set(ids);

  return { collections: tree.collections.filter((collection) => selected.has(collection.id)) };
};

export { listCollections };
