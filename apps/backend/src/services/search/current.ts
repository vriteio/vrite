import { entries } from "#backend/db";
import {
  type AskInput,
  type AskResult,
  type SearchDocument,
  type SearchInput,
  type SearchResult
} from "#backend/lib/search";
import {
  type AuthorizedCollectionTree,
  type Database,
  withAuthorization
} from "#backend/lib/policy";
import { toEntryID, toUUID } from "#backend/lib/primitives";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { ask, search, type SearchDocumentAuthorizer } from "./core";

const createDocumentAuthorizer = (
  authorization: AuthorizedCollectionTree,
  database: Database,
  workspaceID: string
): SearchDocumentAuthorizer => {
  return async (documents: SearchDocument[]): Promise<Set<string>> => {
    if (documents.length === 0) return new Set();

    const rows = await database
      .select({ collectionID: entries.collectionID, entryID: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.workspaceID, workspaceID),
          inArray(
            entries.id,
            documents.map(({ entryID }) => toUUID(entryID))
          ),
          isNull(entries.deletedAt)
        )
      );
    const allowedEntryIDs = new Set(
      rows
        .filter(({ collectionID }) => authorization.canEntry(collectionID, "entry:read"))
        .map(({ entryID }) => toEntryID(entryID))
    );

    return new Set(
      documents.filter(({ entryID }) => allowedEntryIDs.has(entryID)).map(({ id }) => id)
    );
  };
};

const searchCurrent = withAuthorization<SearchInput, undefined, SearchResult>(
  {
    permissions: { session: true, key: ["read:entries", "read:collections"] },
    tree: true
  },
  async ({ authorization, database, input, workspaceID, auth }) => {
    if (input.collectionID) {
      authorization.assertCollectionAction(input.collectionID, "collection:read");
    }

    return search({
      ...input,
      authorizeDocuments: createDocumentAuthorizer(authorization, database, workspaceID),
      scope: "current",
      workspaceID: auth.workspaceID,
      allowedCollectionIDs: authorization.collections.map((collection) => collection.id)
    });
  }
);
const askCurrent = withAuthorization<AskInput, undefined, AskResult>(
  {
    permissions: { session: true },
    tree: true
  },
  async ({ authorization, database, input, workspaceID, auth }) => {
    if (input.collectionID) {
      authorization.assertCollectionAction(input.collectionID, "collection:read");
    }

    return ask({
      ...input,
      authorizeDocuments: createDocumentAuthorizer(authorization, database, workspaceID),
      query: input.question,
      scope: "current",
      workspaceID: auth.workspaceID,
      allowedCollectionIDs: authorization.collections.map((collection) => collection.id)
    });
  }
);

export { askCurrent, searchCurrent };
