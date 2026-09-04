import { collectionSchemas, entries } from "#backend/db";
import { db } from "#backend/lib/adapters";
import { toEntryID, toSchemaID, toUUID } from "#backend/lib/primitives";
import type { Hocuspocus } from "@hocuspocus/server";
import { and, inArray, isNull } from "drizzle-orm";
import type { CollaborationContext } from "./types";

const SCHEMA_CONTENT_RESET_CLOSE_CODE = 4210;
const SCHEMA_CONTENT_RESET_CLOSE_REASON = "Schema Content Reset";
const resettingDocuments = new Set<string>();

const getAffectedLoadedDocumentIDs = async (
  collab: Hocuspocus<CollaborationContext>,
  collectionIDs: string[],
  documentIDs: string[] = []
): Promise<string[]> => {
  const rawCollectionIDs = collectionIDs.map(toUUID);
  const loadedEntryIDs: string[] = [];
  const loadedSchemaIDs: string[] = [];
  const previouslyAffectedDocumentIDs: string[] = [];

  for (const [documentID, document] of collab.documents) {
    try {
      const rawDocumentID = toUUID(documentID);
      const wasInAffectedCollection = [...document.getConnections()].some((connection) => {
        const collectionID = connection.context.collectionID;

        return collectionID && rawCollectionIDs.includes(toUUID(collectionID));
      });

      // A rollback can move an entry back to the root before the reset event arrives.
      if (wasInAffectedCollection) previouslyAffectedDocumentIDs.push(documentID);

      if (documentID.startsWith("sch_")) {
        loadedSchemaIDs.push(rawDocumentID);
      } else {
        loadedEntryIDs.push(rawDocumentID);
      }
    } catch {
      // Authentication prevents unknown document names, but skip one if it remains loaded.
    }
  }

  const [entryRows, schemaRows] = await Promise.all([
    loadedEntryIDs.length > 0 && rawCollectionIDs.length > 0
      ? db
          .select({ id: entries.id })
          .from(entries)
          .where(
            and(
              inArray(entries.id, loadedEntryIDs),
              inArray(entries.collectionID, rawCollectionIDs),
              isNull(entries.deletedAt)
            )
          )
      : [],
    loadedSchemaIDs.length > 0 && rawCollectionIDs.length > 0
      ? db
          .select({ id: collectionSchemas.id })
          .from(collectionSchemas)
          .where(
            and(
              inArray(collectionSchemas.id, loadedSchemaIDs),
              inArray(collectionSchemas.collectionID, rawCollectionIDs)
            )
          )
      : []
  ]);

  return [
    ...new Set([
      ...entryRows.map(({ id }) => toEntryID(id)),
      ...schemaRows.map(({ id }) => toSchemaID(id)),
      ...previouslyAffectedDocumentIDs,
      ...documentIDs.filter((documentID) => collab.documents.has(documentID))
    ])
  ];
};
// A normalized document must reconnect with a new local Y.js state. The dedicated close
// code lets the client lock the stale editor and refresh it instead of enabling offline edits.
const resetSchemaContentDocument = async (
  collab: Hocuspocus<CollaborationContext>,
  documentID: string
): Promise<void> => {
  const document = collab.documents.get(documentID);

  if (!document || resettingDocuments.has(documentID)) return;

  resettingDocuments.add(documentID);

  const sockets = [...document.getConnections()].map((connection) => connection.webSocket);

  try {
    for (const connection of document.getConnections()) {
      connection.close({
        code: SCHEMA_CONTENT_RESET_CLOSE_CODE,
        reason: SCHEMA_CONTENT_RESET_CLOSE_REASON
      });
    }

    await collab.unloadDocument(document);

    for (const socket of sockets) {
      socket.close(SCHEMA_CONTENT_RESET_CLOSE_CODE, SCHEMA_CONTENT_RESET_CLOSE_REASON);
    }
  } finally {
    resettingDocuments.delete(documentID);
  }
};
const resetSchemaContentDocuments = async (
  collab: Hocuspocus<CollaborationContext>,
  collectionIDs: string[]
): Promise<void> => {
  const affectedDocumentIDs = await getAffectedLoadedDocumentIDs(collab, collectionIDs);

  await Promise.all(
    affectedDocumentIDs.map((documentID) => {
      return resetSchemaContentDocument(collab, documentID);
    })
  );
};
const prepareSchemaMigrationDocuments = async (
  collab: Hocuspocus<CollaborationContext>,
  collectionIDs: string[],
  documentIDs: string[] = []
): Promise<void> => {
  const affectedDocumentIDs = await getAffectedLoadedDocumentIDs(
    collab,
    collectionIDs,
    documentIDs
  );
  const affectedDocumentIDSet = new Set(affectedDocumentIDs);
  const loadedDocuments = [...collab.documents.values()];

  if (affectedDocumentIDs.length === 0) return;

  // The migration exists but is not queued yet. Stop accepted writes first, persist every
  // pending update, and only then replace the live documents with read-only connections.
  for (const document of loadedDocuments) {
    if (!affectedDocumentIDSet.has(document.name)) continue;

    for (const connection of document.getConnections()) {
      const context = connection.context;

      connection.readOnly = true;
      context.schemaMigrationReadOnly = true;
    }
  }

  collab.flushPendingStores();
  await Promise.all(loadedDocuments.map((document) => document.saveMutex.waitForUnlock()));
  await Promise.all(
    affectedDocumentIDs.map((documentID) => {
      return resetSchemaContentDocument(collab, documentID);
    })
  );
};

export { prepareSchemaMigrationDocuments, resetSchemaContentDocument, resetSchemaContentDocuments };
