import {
  collectionSchemas,
  collections,
  effectiveSchemaRevisions,
  memberships,
  schemaDraftContributors,
  schemaVersions
} from "#backend/db";
import { emitSchemaEvent } from "#backend/events";
import { db } from "#backend/lib/adapters";
import { replaceContentDocument, serializeContentDocument } from "#backend/lib/content";
import { toCollectionID, toSchemaID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import {
  createSchemaDefinitionFromEditorDocument,
  createSchemaEditorDocument,
  hashSchemaDefinition
} from "#backend/lib/schema";
import { and, eq, inArray, isNotNull, isNull } from "drizzle-orm";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";
import { clearPendingContributors, getPendingContributors } from "./activity";

interface FetchSchemaDocumentInput {
  documentName: string;
  workspaceID: string;
}
interface StoreSchemaDocumentInput extends FetchSchemaDocumentInput {
  state: Uint8Array;
}

const fetchSchemaDocument = async ({
  documentName,
  workspaceID
}: FetchSchemaDocumentInput): Promise<Uint8Array | null> => {
  const rawWorkspaceID = toUUID(workspaceID);
  const [schema] = await db
    .select({
      inheritedDefinition: effectiveSchemaRevisions.definition,
      state: collectionSchemas.draftState,
      definition: collectionSchemas.draftDocument
    })
    .from(collectionSchemas)
    .innerJoin(
      collections,
      and(
        eq(collections.workspaceID, collectionSchemas.workspaceID),
        eq(collections.id, collectionSchemas.collectionID),
        isNotNull(collections.parentID),
        isNull(collections.deletedAt)
      )
    )
    .leftJoin(
      effectiveSchemaRevisions,
      and(
        eq(effectiveSchemaRevisions.workspaceID, collections.workspaceID),
        eq(effectiveSchemaRevisions.collectionID, collections.parentID),
        eq(effectiveSchemaRevisions.active, true)
      )
    )
    .where(
      and(
        eq(collectionSchemas.id, toUUID(documentName)),
        eq(collectionSchemas.workspaceID, rawWorkspaceID),
        eq(collectionSchemas.enabled, true)
      )
    );

  if (!schema?.definition) return null;

  const document = new Doc();

  if (schema.state) {
    applyUpdate(document, new Uint8Array(schema.state));
  }

  const currentDocument = schema.state
    ? serializeContentDocument(document)
    : createSchemaEditorDocument(schema.definition);
  const localDefinition = createSchemaDefinitionFromEditorDocument(currentDocument);
  const editorDocument = createSchemaEditorDocument(localDefinition, schema.inheritedDefinition);

  if (JSON.stringify(currentDocument) !== JSON.stringify(editorDocument)) {
    replaceContentDocument(document, editorDocument);
  }

  return encodeStateAsUpdate(document);
};
const storeSchemaDocument = async ({
  documentName,
  state,
  workspaceID
}: StoreSchemaDocumentInput): Promise<void> => {
  const schemaID = toUUID(documentName);
  const rawWorkspaceID = toUUID(workspaceID);
  const pendingContributorIDs = getPendingContributors(documentName);
  const contributorIDs = pendingContributorIDs.map(toUUID);
  const stored = await db.transaction(async (tx) => {
    const [schema] = await tx
      .select({
        id: collectionSchemas.id,
        collectionID: collectionSchemas.collectionID,
        state: collectionSchemas.draftState
      })
      .from(collectionSchemas)
      .innerJoin(
        collections,
        and(
          eq(collections.workspaceID, collectionSchemas.workspaceID),
          eq(collections.id, collectionSchemas.collectionID),
          isNotNull(collections.parentID),
          isNull(collections.deletedAt)
        )
      )
      .where(
        and(
          eq(collectionSchemas.id, schemaID),
          eq(collectionSchemas.workspaceID, rawWorkspaceID),
          eq(collectionSchemas.enabled, true)
        )
      )
      .for("update");

    if (!schema) return null;

    const persistedDocument = new Doc();

    if (schema.state) applyUpdate(persistedDocument, new Uint8Array(schema.state));

    applyUpdate(persistedDocument, state);

    const mergedState = encodeStateAsUpdate(persistedDocument);
    const editorDocument = serializeContentDocument(persistedDocument);
    const definition = createSchemaDefinitionFromEditorDocument(editorDocument);
    const hash = hashSchemaDefinition(definition);
    const [activeVersion] = await tx
      .select({ hash: schemaVersions.hash })
      .from(schemaVersions)
      .where(
        and(
          eq(schemaVersions.workspaceID, rawWorkspaceID),
          eq(schemaVersions.schemaID, schemaID),
          eq(schemaVersions.active, true)
        )
      );

    await tx
      .update(collectionSchemas)
      .set({
        draftState: Buffer.from(mergedState),
        draftDocument: definition,
        draftHash: hash,
        updatedAt: new Date()
      })
      .where(
        and(eq(collectionSchemas.id, schemaID), eq(collectionSchemas.workspaceID, rawWorkspaceID))
      );

    if (contributorIDs.length > 0) {
      const contributors = await tx
        .select({ id: memberships.id })
        .from(memberships)
        .where(
          and(eq(memberships.workspaceID, rawWorkspaceID), inArray(memberships.id, contributorIDs))
        )
        .for("key share");

      if (contributors.length > 0) {
        await tx
          .insert(schemaDraftContributors)
          .values(
            contributors.map(({ id: membershipID }) => ({
              workspaceID: rawWorkspaceID,
              schemaID,
              membershipID
            }))
          )
          .onConflictDoNothing();
      }
    }

    return {
      collectionID: schema.collectionID,
      hasActiveVersion: Boolean(activeVersion),
      hasUnappliedChanges: !activeVersion || activeVersion.hash !== hash
    };
  });

  clearPendingContributors(documentName, pendingContributorIDs);

  if (stored) {
    emitSchemaEvent(toWorkspaceID(rawWorkspaceID), {
      action: "schema:update",
      data: {
        id: toSchemaID(schemaID),
        collectionID: toCollectionID(stored.collectionID),
        enabled: true,
        hasActiveVersion: stored.hasActiveVersion,
        hasUnappliedChanges: stored.hasUnappliedChanges
      }
    });
  }
};

export { fetchSchemaDocument, storeSchemaDocument };
