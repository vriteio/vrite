import type { useWorkspace } from "#web/context/workspace";

interface ExplorerMoveInput {
  collectionIDs: string[];
  entryIDs: string[];
  parentID: string | null;
  execute(confirmedDataLoss: boolean): Promise<void>;
}

type WorkspaceContent = ReturnType<typeof useWorkspace>["content"];

const isSchemaMoveConfirmationRequired = (error: unknown) => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PRECONDITION_FAILED"
  );
};
const getSchemaChain = (
  content: WorkspaceContent,
  activeSchemaCollectionIDs: Set<string>,
  collectionID: string | null
) => {
  const collection = collectionID ? content.collections.get({ collectionID }) : null;
  const collectionIDs = collectionID ? [...(collection?.ancestors || []), collectionID] : [];

  return collectionIDs.filter((id) => activeSchemaCollectionIDs.has(id));
};
const schemaChainsMatch = (left: string[], right: string[]) => {
  return left.length === right.length && left.every((id, index) => id === right[index]);
};
const requiresSchemaMoveConfirmation = (content: WorkspaceContent, input: ExplorerMoveInput) => {
  const activeSchemaCollectionIDs = new Set(
    content
      .schemasCollection()
      .find({ enabled: true, hasActiveVersion: true })
      .fetch()
      .map((schema) => schema.collectionID)
  );
  const destinationChain = getSchemaChain(content, activeSchemaCollectionIDs, input.parentID);
  const entryRequiresMigration = input.entryIDs.some((entryID) => {
    const sourceCollectionID = content.entries.get({ entryID })?.collectionID || null;
    const sourceChain = getSchemaChain(content, activeSchemaCollectionIDs, sourceCollectionID);

    return destinationChain.length > 0 && !schemaChainsMatch(sourceChain, destinationChain);
  });

  if (entryRequiresMigration) return true;

  return input.collectionIDs.some((collectionID) => {
    const collection = content.collections.get({ collectionID });
    const sourceParentID = collection?.ancestors.at(-1) || null;
    const sourceChain = getSchemaChain(content, activeSchemaCollectionIDs, sourceParentID);

    if (schemaChainsMatch(sourceChain, destinationChain)) return false;
    if (destinationChain.length > 0) return true;

    const subtreeHasSchema = [...activeSchemaCollectionIDs].some((schemaCollectionID) => {
      const schemaCollection = content.collections.get({ collectionID: schemaCollectionID });

      return (
        schemaCollectionID === collectionID ||
        Boolean(schemaCollection?.ancestors.includes(collectionID))
      );
    });

    return sourceChain.length > 0 && subtreeHasSchema;
  });
};

export { isSchemaMoveConfirmationRequired, requiresSchemaMoveConfirmation };
export type { ExplorerMoveInput };
