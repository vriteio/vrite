import { collectionSchemas, entries } from "#backend/db";
import { db } from "#backend/lib/adapters";
import {
  replaceContentDocument,
  serializeContentDocument,
  type ContentNode
} from "#backend/lib/content";
import { toUUID } from "#backend/lib/primitives";
import {
  createSchemaDefinitionFromEditorDocument,
  type SchemaDefinition
} from "#backend/lib/schema";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { getContentSnapshot, setDocumentTitle } from "./document";
import { prepareSchemaMigrationDocuments } from "./schema-content";
import { collab } from "./server";
import type { ContentSnapshot } from "./types";

const prepareSchemaMigrationConnections = async (
  collectionIDs: string[],
  entryIDs: string[] = []
): Promise<void> => {
  await prepareSchemaMigrationDocuments(collab, collectionIDs, entryIDs);
};
const assertDocumentWorkspace = async (
  documentName: string,
  workspaceID: string
): Promise<void> => {
  const [entry] = await db
    .select({ id: entries.id })
    .from(entries)
    .where(
      and(
        eq(entries.id, toUUID(documentName)),
        eq(entries.workspaceID, toUUID(workspaceID)),
        isNull(entries.deletedAt)
      )
    );

  if (!entry) throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
};
const updateDocumentTitle = async (
  documentName: string,
  title: string,
  workspaceID: string,
  contributorID?: string
): Promise<void> => {
  const connection = await collab.openDirectConnection(documentName, {
    contributorID,
    workspaceID
  });

  try {
    await connection.transact((document) => {
      setDocumentTitle(document, title);
    });
  } finally {
    await connection.disconnect();
  }
};
const getCurrentDocumentContent = async (
  documentName: string,
  workspaceID: string
): Promise<ContentSnapshot> => {
  await assertDocumentWorkspace(documentName, workspaceID);

  const connection = await collab.openDirectConnection(documentName, { workspaceID });
  let snapshot: ContentSnapshot | undefined;

  try {
    await connection.transact((document) => {
      snapshot = getContentSnapshot(document);
    });
  } finally {
    await connection.disconnect();
  }

  if (!snapshot) throw new Error("Failed to read collaboration document");

  return snapshot;
};
const replaceDocumentContent = async (
  documentName: string,
  content: ContentNode,
  workspaceID: string
): Promise<ContentSnapshot> => {
  const connection = await collab.openDirectConnection(documentName, { workspaceID });
  let previous: ContentSnapshot | undefined;

  try {
    await connection.transact((document) => {
      previous = getContentSnapshot(document);
      replaceContentDocument(document, content);
    });
  } finally {
    await connection.disconnect();
  }

  if (!previous) throw new Error("Failed to replace collaboration document");

  return previous;
};
const getCurrentSchemaDefinition = async (
  documentName: string,
  workspaceID: string
): Promise<SchemaDefinition> => {
  const [schema] = await db
    .select({ id: collectionSchemas.id })
    .from(collectionSchemas)
    .where(
      and(
        eq(collectionSchemas.id, toUUID(documentName)),
        eq(collectionSchemas.workspaceID, toUUID(workspaceID)),
        eq(collectionSchemas.enabled, true)
      )
    );

  if (!schema) throw new ORPCError("NOT_FOUND", { message: "Schema not found" });

  const connection = await collab.openDirectConnection(documentName, { workspaceID });
  let definition: SchemaDefinition | undefined;

  try {
    await connection.transact((document) => {
      definition = createSchemaDefinitionFromEditorDocument(serializeContentDocument(document));
    });
  } finally {
    await connection.disconnect();
  }

  if (!definition) throw new Error("Failed to read schema collaboration document");

  return definition;
};

export {
  getCurrentDocumentContent,
  getCurrentSchemaDefinition,
  prepareSchemaMigrationConnections,
  replaceDocumentContent,
  updateDocumentTitle
};
