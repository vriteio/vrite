import { rankBetweenNeighbors, toEntryID, toUUID } from "#backend/lib/primitives";
import {
  collections,
  contents,
  effectiveSchemaRevisions,
  entries,
  entryPublications,
  schemaMigrationCollections,
  schemaMigrationEntries,
  schemaMigrations
} from "#backend/db";
import { isCollectionPublishingEnabled, loadPublishingTree } from "#backend/lib/publishing";
import { and, desc, eq, gt, inArray, isNull, lt, ne } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { withAuthorization, type AuthorizedServiceInput } from "#backend/lib/policy";
import type { PublishingEntryStatus } from "#backend/lib/publishing";
import { prepareSchemaMigrationConnections } from "#backend/collaboration";
import { submitSchemaMigration } from "#backend/lib/queue";
import type { EffectiveSchemaChangePlan } from "#backend/lib/schema/migration/effective-change";

interface MoveEntryInput {
  confirmedDataLoss?: boolean;
  id: string;
  order: string;
  collectionID?: string | null;
}
interface MoveEntryResult {
  collectionChanged: boolean;
  order: string;
  publishingEntries: PublishingEntryStatus[];
  restrictedBoundaryChanged: boolean;
  schemaMigration: EffectiveSchemaChangePlan;
}
interface ResolvedMoveEntry {
  destinationCollectionID: string | null;
  sourceCollectionID: string | null;
  sourceOrder: string;
}

const planEntryMove = withAuthorization<MoveEntryInput, ResolvedMoveEntry, MoveEntryResult>(
  {
    actions: ({ resolved }) => ({
      entries: [
        { action: "entry:move", collectionID: resolved.sourceCollectionID },
        { action: "entry:create", collectionID: resolved.destinationCollectionID }
      ]
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const [entry] = await database
        .select({ collectionID: entries.collectionID, rank: entries.rank })
        .from(entries)
        .where(
          and(
            eq(entries.id, toUUID(input.id)),
            eq(entries.workspaceID, workspaceID),
            isNull(entries.deletedAt)
          )
        )
        .for("update");

      if (!entry) throw new ORPCError("NOT_FOUND");

      const destinationCollectionID =
        input.collectionID === undefined
          ? entry.collectionID
          : input.collectionID === null
            ? null
            : toUUID(input.collectionID);

      if (destinationCollectionID) {
        const [collection] = await database
          .select({ id: collections.id })
          .from(collections)
          .where(
            and(
              eq(collections.id, destinationCollectionID),
              eq(collections.workspaceID, workspaceID),
              isNull(collections.deletedAt)
            )
          )
          .for("update");

        if (!collection) throw new ORPCError("BAD_REQUEST", { message: "Collection not found" });
      }

      return {
        destinationCollectionID,
        sourceCollectionID: entry.collectionID,
        sourceOrder: entry.rank
      };
    },
    tree: true,
    transaction: "locked-workspace"
  },
  async ({ auth, authorization, database, input, resolved, workspaceID }) => {
    const entryID = toUUID(input.id);
    const { destinationCollectionID, sourceCollectionID } = resolved;

    const publishingTree = await loadPublishingTree(database, workspaceID);
    const wasPublishingEnabled = isCollectionPublishingEnabled(publishingTree, sourceCollectionID);
    const willBePublishingEnabled = isCollectionPublishingEnabled(
      publishingTree,
      destinationCollectionID
    );
    const crossesPublishingBoundary = wasPublishingEnabled !== willBePublishingEnabled;
    const restrictedBoundaryChanged =
      authorization.getRestrictedBoundaryID(sourceCollectionID) !==
      authorization.getRestrictedBoundaryID(destinationCollectionID);

    const siblingFilter = destinationCollectionID
      ? and(
          eq(entries.workspaceID, workspaceID),
          eq(entries.collectionID, destinationCollectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
        )
      : and(
          eq(entries.workspaceID, workspaceID),
          isNull(entries.collectionID),
          ne(entries.id, entryID),
          isNull(entries.deletedAt)
        );
    const [collision] = await database
      .select({ rank: entries.rank })
      .from(entries)
      .where(and(siblingFilter, eq(entries.rank, input.order)))
      .limit(1);
    let rank = input.order;

    if (collision) {
      const [lower] = await database
        .select({ rank: entries.rank })
        .from(entries)
        .where(and(siblingFilter, lt(entries.rank, input.order)))
        .orderBy(desc(entries.rank))
        .limit(1);

      if (lower) {
        rank = rankBetweenNeighbors(lower.rank, input.order);
      } else {
        const [upper] = await database
          .select({ rank: entries.rank })
          .from(entries)
          .where(and(siblingFilter, gt(entries.rank, input.order)))
          .orderBy(entries.rank)
          .limit(1);

        rank = rankBetweenNeighbors(input.order, upper?.rank);
      }
    }

    await database
      .update(entries)
      .set({
        rank,
        ...(input.collectionID !== undefined && { collectionID: destinationCollectionID }),
        updatedAt: new Date()
      })
      .where(
        and(
          eq(entries.id, entryID),
          eq(entries.workspaceID, workspaceID),
          isNull(entries.deletedAt)
        )
      );

    let schemaMigration: EffectiveSchemaChangePlan = {
      affectedCollectionIDs: [],
      migrationID: null,
      totalEntries: 0
    };

    if (input.collectionID !== undefined && sourceCollectionID !== destinationCollectionID) {
      const revisionCollectionIDs = [sourceCollectionID, destinationCollectionID].filter(
        (collectionID): collectionID is string => Boolean(collectionID)
      );
      const revisionRows =
        revisionCollectionIDs.length > 0
          ? await database
              .select()
              .from(effectiveSchemaRevisions)
              .where(
                and(
                  eq(effectiveSchemaRevisions.workspaceID, workspaceID),
                  inArray(effectiveSchemaRevisions.collectionID, revisionCollectionIDs),
                  eq(effectiveSchemaRevisions.active, true)
                )
              )
          : [];
      const sourceRevision = revisionRows.find(
        ({ collectionID }) => collectionID === sourceCollectionID
      );
      const targetRevision = revisionRows.find(
        ({ collectionID }) => collectionID === destinationCollectionID
      );
      const [content] = await database
        .select({
          hash: contents.hash,
          schemaRevisionID: contents.schemaRevisionID
        })
        .from(contents)
        .where(eq(contents.entryID, entryID));
      const alreadyMatchesTarget = content?.schemaRevisionID === targetRevision?.id;
      const schemasHaveSameContent = Boolean(
        sourceRevision &&
        targetRevision &&
        content?.schemaRevisionID === sourceRevision.id &&
        sourceRevision.hash === targetRevision.hash
      );

      if (!targetRevision) {
        await database
          .update(contents)
          .set({ schemaRevisionID: null, updatedAt: new Date() })
          .where(eq(contents.entryID, entryID));
      } else if (alreadyMatchesTarget || schemasHaveSameContent) {
        await database
          .update(contents)
          .set({ schemaRevisionID: targetRevision.id, updatedAt: new Date() })
          .where(eq(contents.entryID, entryID));
      } else {
        if (!input.confirmedDataLoss) {
          throw new ORPCError("PRECONDITION_FAILED", {
            message: "Schema migrations require explicit data-loss confirmation"
          });
        }

        const [migration] = await database
          .insert(schemaMigrations)
          .values({
            workspaceID,
            status: "queued",
            entryMove: {
              entryID,
              sourceCollectionID,
              sourceOrder: resolved.sourceOrder,
              unpublishOnCompletion: wasPublishingEnabled && !willBePublishingEnabled
            },
            initiatedBy: auth.session?.memberID ? toUUID(auth.session.memberID) : null,
            totalEntries: 1
          })
          .returning();

        await database.insert(schemaMigrationCollections).values({
          workspaceID,
          migrationID: migration.id,
          collectionID: targetRevision.collectionID,
          sourceRevisionID: targetRevision.id,
          targetRevisionID: targetRevision.id
        });
        if (sourceCollectionID) {
          await database.insert(schemaMigrationCollections).values({
            workspaceID,
            migrationID: migration.id,
            collectionID: sourceCollectionID,
            sourceRevisionID: sourceRevision?.id || null,
            targetRevisionID: sourceRevision?.id || null
          });
        }

        await database.insert(schemaMigrationEntries).values({
          workspaceID,
          migrationID: migration.id,
          entryID,
          sourceRevisionID: content?.schemaRevisionID || null,
          targetRevisionID: targetRevision.id,
          sourceHash: content?.hash || null
        });

        schemaMigration = {
          affectedCollectionIDs: revisionCollectionIDs,
          migrationID: migration.id,
          totalEntries: 1
        };
      }
    }

    if (wasPublishingEnabled && !willBePublishingEnabled && !schemaMigration.migrationID) {
      await database.delete(entryPublications).where(eq(entryPublications.entryID, entryID));
    }

    return {
      collectionChanged: sourceCollectionID !== destinationCollectionID,
      order: rank,
      publishingEntries: crossesPublishingBoundary
        ? [
            {
              entryID: toEntryID(entryID),
              hasUnpublishedChanges: willBePublishingEnabled,
              versionID: null
            }
          ]
        : [],
      restrictedBoundaryChanged,
      schemaMigration
    };
  }
);
const moveEntry = async (
  input: MoveEntryInput & AuthorizedServiceInput
): Promise<MoveEntryResult> => {
  const result = await planEntryMove(input);

  await submitSchemaMigration({
    ...result.schemaMigration,
    prepareAffectedContent: () => {
      return prepareSchemaMigrationConnections(
        result.schemaMigration.affectedCollectionIDs,
        result.collectionChanged ? [toEntryID(toUUID(input.id))] : []
      );
    },
    workspaceID: input.auth.workspaceID
  });

  return result;
};

export { moveEntry };
