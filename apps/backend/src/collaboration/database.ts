import {
  contents,
  entries,
  entryVersionActivity,
  entryVersionActivityContributors,
  memberships
} from "#backend/db";
import { emitEntryEvent } from "#backend/events";
import { db } from "#backend/lib/adapters";
import { hashContentDocument, serializeContentDocument } from "#backend/lib/content";
import { emitPublishingStatusUpdates } from "#backend/lib/publishing/status-events";
import { toEntryID, toUUID, toWorkspaceID } from "#backend/lib/primitives";
import {
  AUTOMATIC_VERSION_MAX_PERIOD_MS,
  AUTOMATIC_VERSION_QUIET_PERIOD_MS
} from "#backend/lib/versioning/config";
import { Database } from "@hocuspocus/extension-database";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { applyUpdate, Doc, encodeStateAsUpdate } from "yjs";
import { clearPendingContributors, getPendingContributors } from "./activity";
import { getDocumentTitle, setDocumentTitle } from "./document";

const collaborationDatabase = new Database({
  async fetch({ context, documentName }) {
    const workspaceID = toUUID(context.workspaceID);

    try {
      const [content] = await db
        .select({ state: contents.state, name: entries.name })
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

      if (content?.state) return new Uint8Array(content.state);

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
    const entryID = toUUID(documentName);
    const workspaceID = toUUID(lastContext.workspaceID);
    const pendingContributorIDs = getPendingContributors(documentName);
    const contributorIDs = pendingContributorIDs.map(toUUID);
    const stored = await db.transaction(async (tx) => {
      const [entry] = await tx
        .select({
          id: entries.id,
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

      const [content] = await tx
        .select({ state: contents.state, hash: contents.hash })
        .from(contents)
        .where(eq(contents.entryID, entryID));
      const persistedDocument = new Doc();

      if (content?.state) applyUpdate(persistedDocument, new Uint8Array(content.state));

      applyUpdate(persistedDocument, state);

      const mergedState = encodeStateAsUpdate(persistedDocument);
      const document = serializeContentDocument(persistedDocument);
      const hash = hashContentDocument(document);
      const title = getDocumentTitle(persistedDocument);
      const contentChanged = content?.hash !== hash;

      await tx
        .insert(contents)
        .values({
          entryID,
          workspaceID: entry.workspaceID,
          state: Buffer.from(mergedState),
          document,
          hash,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: contents.entryID,
          set: {
            state: Buffer.from(mergedState),
            document,
            hash,
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

        return { contentChanged, entry, title };
      }

      return { contentChanged, entry, title: null };
    });

    clearPendingContributors(documentName, pendingContributorIDs);

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
      await emitPublishingStatusUpdates({
        workspaceID: stored.entry.workspaceID,
        entryIDs: [stored.entry.id]
      });
    }
  }
});

export { collaborationDatabase };
