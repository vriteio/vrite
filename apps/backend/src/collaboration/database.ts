import {
  contents,
  effectiveSchemaRevisions,
  entries,
  entryPublications,
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersions,
  publishingChannels,
  memberships,
  schemaMigrationEntries,
  schemaMigrations
} from "#backend/db";
import { emitEntryEvent, emitPublishingEntryContentUpdates } from "#backend/events";
import { db } from "#backend/lib/adapters";
import {
  hashContentDocument,
  replaceContentDocument,
  serializeContentDocument
} from "#backend/lib/content";
import { PUBLISHED_CHANNEL_CODE } from "#backend/lib/publishing";
import { enqueueCurrentEntrySync } from "#backend/lib/queue";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import {
  getResolvedSchemaDefinition,
  migrateContentToSchema,
  removeContentSchema
} from "#backend/lib/schema";
import {
  AUTOMATIC_VERSION_MAX_PERIOD_MS,
  AUTOMATIC_VERSION_QUIET_PERIOD_MS
} from "#backend/lib/versioning/config";
import { Database } from "@hocuspocus/extension-database";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";
import { clearPendingContributors, getPendingContributors } from "./activity";
import { getDocumentTitle, setDocumentTitle } from "./document";
import { fetchSchemaDocument, storeSchemaDocument } from "./schema-database";

const collaborationDatabase = new Database({
  async fetch({ context, documentName }) {
    if (documentName.startsWith("sch_")) {
      return fetchSchemaDocument({
        documentName,
        workspaceID: context.workspaceID
      });
    }

    const workspaceID = toUUID(context.workspaceID);

    try {
      const [content] = await db
        .select({
          state: contents.state,
          name: entries.name,
          schemaRevisionID: contents.schemaRevisionID
        })
        .from(contents)
        .innerJoin(entries, eq(entries.id, contents.entryID))
        .where(
          and(
            eq(contents.entryID, toUUID(documentName)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .limit(1);

      if (content?.state) {
        if (content.schemaRevisionID) return new Uint8Array(content.state);

        const document = new Doc();

        applyUpdate(document, new Uint8Array(content.state));

        const unrestrictedContent = removeContentSchema(serializeContentDocument(document));

        if (!unrestrictedContent.changed) return new Uint8Array(content.state);

        replaceContentDocument(document, unrestrictedContent.document);
        return encodeStateAsUpdate(document);
      }

      if (content) {
        const document = new Doc();

        setDocumentTitle(document, content.name);

        return encodeStateAsUpdate(document);
      }

      return null;
    } catch (error) {
      console.error("Collaboration database initialization failed", { error });
      throw error;
    }
  },
  async store({ documentName, lastContext, state }) {
    if (documentName.startsWith("sch_")) {
      return storeSchemaDocument({
        documentName,
        state,
        workspaceID: lastContext.workspaceID
      });
    }

    const entryID = toUUID(documentName);
    const workspaceID = toUUID(lastContext.workspaceID);
    const pendingContributorIDs = getPendingContributors(documentName);
    const contributorIDs = pendingContributorIDs.map(toUUID);
    const stored = await db.transaction(async (tx) => {
      const [entry] = await tx
        .select({
          id: entries.id,
          collectionID: entries.collectionID,
          workspaceID: entries.workspaceID,
          name: entries.name
        })
        .from(entries)
        .where(
          and(
            eq(entries.id, entryID),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .for("update");

      if (!entry) return null;

      const [activeMigration] = entry.collectionID
        ? await tx
            .select({
              entryStatus: schemaMigrationEntries.status,
              jobID: schemaMigrations.jobID,
              status: schemaMigrations.status
            })
            .from(schemaMigrationEntries)
            .innerJoin(
              schemaMigrations,
              and(
                eq(schemaMigrations.workspaceID, schemaMigrationEntries.workspaceID),
                eq(schemaMigrations.id, schemaMigrationEntries.migrationID)
              )
            )
            .where(
              and(
                eq(schemaMigrationEntries.workspaceID, workspaceID),
                eq(schemaMigrationEntries.entryID, entry.id),
                inArray(schemaMigrations.status, ["queued", "running", "rolling_back"])
              )
            )
            .limit(1)
        : [];
      const preparingMigration =
        activeMigration?.status === "queued" &&
        activeMigration.jobID === null &&
        activeMigration.entryStatus === "queued";

      if (activeMigration && !preparingMigration) return null;

      // Preserve pending edits until the worker saves the recovery version. A move has
      // already changed the collection, so its active schema can be the destination schema.
      const [activeRevision] =
        entry.collectionID && !preparingMigration
          ? await tx
              .select({
                definition: effectiveSchemaRevisions.definition,
                id: effectiveSchemaRevisions.id
              })
              .from(effectiveSchemaRevisions)
              .where(
                and(
                  eq(effectiveSchemaRevisions.workspaceID, workspaceID),
                  eq(effectiveSchemaRevisions.collectionID, entry.collectionID),
                  eq(effectiveSchemaRevisions.active, true)
                )
              )
              .limit(1)
          : [];

      const [content] = await tx
        .select({
          state: contents.state,
          hash: contents.hash,
          publishedHash: entryVersions.hash,
          publishedVersionID: entryPublications.versionID
        })
        .from(contents)
        .leftJoin(
          publishingChannels,
          and(
            eq(publishingChannels.workspaceID, workspaceID),
            eq(publishingChannels.code, PUBLISHED_CHANNEL_CODE)
          )
        )
        .leftJoin(
          entryPublications,
          and(
            eq(entryPublications.entryID, entryID),
            eq(entryPublications.channelID, publishingChannels.id)
          )
        )
        .leftJoin(entryVersions, eq(entryVersions.id, entryPublications.versionID))
        .where(eq(contents.entryID, entryID));
      const persistedDocument = new Doc();

      if (content?.state) applyUpdate(persistedDocument, new Uint8Array(content.state));

      applyUpdate(persistedDocument, state);

      // The editor enforces schemas during editing. The backend normalizes it before saving, never rewriting the live document.
      const submittedDocument = serializeContentDocument(persistedDocument);
      const normalizedContent = activeRevision
        ? migrateContentToSchema({
            defaultMode: "none",
            document: submittedDocument,
            schema: getResolvedSchemaDefinition(activeRevision.definition)
          })
        : preparingMigration
          ? null
          : removeContentSchema(submittedDocument);

      if (normalizedContent?.changed) {
        replaceContentDocument(persistedDocument, normalizedContent.document);
      }

      const mergedState = encodeStateAsUpdate(persistedDocument);
      const document = serializeContentDocument(persistedDocument);
      const hash = hashContentDocument(document);
      const title = getDocumentTitle(persistedDocument);
      const contentChanged = content?.hash !== hash;
      const publishingEntry = {
        entryID: toEntryID(entry.id),
        matchesPublishedVersion: Boolean(
          content?.publishedVersionID && hash === content.publishedHash
        )
      };

      await tx
        .insert(contents)
        .values({
          entryID,
          workspaceID: entry.workspaceID,
          state: Buffer.from(mergedState),
          document,
          hash,
          ...(activeRevision && { schemaRevisionID: activeRevision.id }),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: contents.entryID,
          set: {
            state: Buffer.from(mergedState),
            document,
            hash,
            ...(activeRevision && { schemaRevisionID: activeRevision.id }),
            updatedAt: new Date()
          }
        });

      if (contentChanged) {
        const now = new Date();

        await tx
          .insert(entryVersionActivity)
          .values({
            entryID,
            workspaceID: entry.workspaceID,
            dueAt: new Date(now.getTime() + AUTOMATIC_VERSION_QUIET_PERIOD_MS),
            firstChangedAt: now,
            lastChangedAt: now
          })
          .onConflictDoUpdate({
            target: entryVersionActivity.entryID,
            set: {
              lastChangedAt: sql`now()`,
              dueAt: sql`least(
                ${entryVersionActivity.firstChangedAt} + ${AUTOMATIC_VERSION_MAX_PERIOD_MS} * interval '1 millisecond',
                now() + ${AUTOMATIC_VERSION_QUIET_PERIOD_MS} * interval '1 millisecond'
              )`
            }
          });
      }

      if (contributorIDs.length > 0) {
        const [activity] = await tx
          .select({ entryID: entryVersionActivity.entryID })
          .from(entryVersionActivity)
          .where(eq(entryVersionActivity.entryID, entryID));

        if (activity) {
          const contributors = await tx
            .select({ id: memberships.id })
            .from(memberships)
            .where(
              and(
                eq(memberships.workspaceID, entry.workspaceID),
                inArray(memberships.id, contributorIDs)
              )
            )
            .for("key share");

          if (contributors.length > 0) {
            await tx
              .insert(entryVersionActivityContributors)
              .values(
                contributors.map(({ id: membershipID }) => ({
                  workspaceID: entry.workspaceID,
                  entryID,
                  membershipID
                }))
              )
              .onConflictDoNothing();
          }
        }
      }

      if (title !== null && entry.name !== title) {
        await tx
          .update(entries)
          .set({ name: title, updatedAt: new Date() })
          .where(and(eq(entries.id, entryID), isNull(entries.deletedAt)));

        return {
          contentChanged,
          contentNormalized: Boolean(normalizedContent?.changed),
          entry,
          publishingEntry,
          title
        };
      }

      return {
        contentChanged,
        contentNormalized: Boolean(normalizedContent?.changed),
        entry,
        publishingEntry,
        title: null
      };
    });

    clearPendingContributors(documentName, pendingContributorIDs);

    if (stored?.contentNormalized) {
      emitEntryEvent(toWorkspaceID(stored.entry.workspaceID), {
        action: "entry:content-reset",
        data: { id: toEntryID(stored.entry.id) }
      });
    }

    if (stored && stored.title !== null) {
      emitEntryEvent(toWorkspaceID(stored.entry.workspaceID), {
        action: "entry:update",
        data: {
          id: toEntryID(stored.entry.id),
          name: stored.title
        }
      });
    }

    if (stored?.contentChanged) {
      emitPublishingEntryContentUpdates({
        workspaceID: toWorkspaceID(stored.entry.workspaceID),
        entries: [stored.publishingEntry]
      });
    }

    if (stored && (stored.contentChanged || stored.title !== null)) {
      void enqueueCurrentEntrySync({
        workspaceID: toWorkspaceID(stored.entry.workspaceID),
        entryIDs: [toEntryID(stored.entry.id)]
      });
    }
  }
});

export { collaborationDatabase };
