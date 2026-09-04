import {
  contents,
  entries,
  entryPublications,
  entryVersionActivity,
  entryVersionActivityContributors,
  entryVersionContributors,
  entryVersions,
  workspaces
} from "#backend/db";
import { db } from "#backend/lib/adapters";
import { config } from "#backend/lib/config";
import { emitVersionDeletionEvents, emitVersionEvent } from "#backend/events/versions";
import { mapVersionSummary, type VersionSummary } from "#backend/lib/data/entry-version";
import { toEntryID, toVersionID, toWorkspaceID } from "#backend/lib/primitives";
import { and, desc, eq, isNull, lte, sql } from "drizzle-orm";
import { AUTOMATIC_VERSION_QUEUE_INTERVAL_MS } from "./config";

interface ActivityCandidate {
  entryID: string;
  workspaceID: string;
  deletedAt: Date | null;
}

const AUTOMATIC_VERSION_BATCH_SIZE = 100;

let automaticVersionInterval: NodeJS.Timeout | undefined;
let automaticVersionRun: Promise<void> | undefined;

const processActivity = async (candidate: ActivityCandidate): Promise<void> => {
  if (candidate.deletedAt) {
    await db
      .delete(entryVersionActivity)
      .where(eq(entryVersionActivity.entryID, candidate.entryID));
    return;
  }

  const createdVersion = await db.transaction(async (tx): Promise<VersionSummary | null> => {
    const [entry] = await tx
      .select({ id: entries.id, name: entries.name })
      .from(entries)
      .where(
        and(
          eq(entries.id, candidate.entryID),
          eq(entries.workspaceID, candidate.workspaceID),
          isNull(entries.deletedAt)
        )
      )
      .for("update", { skipLocked: true });

    if (!entry) return null;

    const [activity] = await tx
      .select({ entryID: entryVersionActivity.entryID })
      .from(entryVersionActivity)
      .where(
        and(
          eq(entryVersionActivity.entryID, candidate.entryID),
          lte(entryVersionActivity.dueAt, new Date())
        )
      )
      .for("update");

    if (!activity) return null;

    const [content] = await tx
      .select({ document: contents.document, hash: contents.hash })
      .from(contents)
      .where(eq(contents.entryID, candidate.entryID));
    const [latestVersion] = await tx
      .select({ hash: entryVersions.hash })
      .from(entryVersions)
      .where(
        and(
          eq(entryVersions.workspaceID, candidate.workspaceID),
          eq(entryVersions.entryID, candidate.entryID)
        )
      )
      .orderBy(desc(entryVersions.createdAt))
      .limit(1);

    if (content?.document && content.hash && latestVersion?.hash !== content.hash) {
      const [version] = await tx
        .insert(entryVersions)
        .values({
          workspaceID: candidate.workspaceID,
          entryID: candidate.entryID,
          entryName: entry.name,
          document: content.document,
          hash: content.hash,
          reason: "auto"
        })
        .returning();
      const contributors = await tx
        .select({ membershipID: entryVersionActivityContributors.membershipID })
        .from(entryVersionActivityContributors)
        .where(eq(entryVersionActivityContributors.entryID, candidate.entryID));

      if (contributors.length > 0) {
        await tx.insert(entryVersionContributors).values(
          contributors.map(({ membershipID }) => ({
            workspaceID: candidate.workspaceID,
            versionID: version.id,
            membershipID
          }))
        );
      }

      await tx
        .delete(entryVersionActivity)
        .where(eq(entryVersionActivity.entryID, candidate.entryID));

      return mapVersionSummary(
        version,
        contributors.map(({ membershipID }) => membershipID)
      );
    }

    await tx
      .delete(entryVersionActivity)
      .where(eq(entryVersionActivity.entryID, candidate.entryID));

    return null;
  });

  if (createdVersion) {
    emitVersionEvent(candidate.workspaceID, {
      action: "version:create",
      data: createdVersion
    });
  }
};
const deleteExpiredAutomaticVersions = async (): Promise<void> => {
  const billingConfigured = Boolean(config.STRIPE_SECRET_KEY);

  const deleted = await db.execute<{ entryID: string; id: string; workspaceID: string }>(sql`
    delete from ${entryVersions}
    using ${workspaces}
    where ${entryVersions.workspaceID} = ${workspaces.id}
      and ${entryVersions.reason} in ('auto', 'schema-migration')
      and not exists (
        select 1
        from ${entryPublications}
        where ${entryPublications.versionID} = ${entryVersions.id}
      )
      and ${entryVersions.createdAt} < now() - (
        case
          when ${billingConfigured} and ${workspaces.subscriptionPlan} = 'pro'
            then ${config.PRO_VERSION_RETENTION_DAYS}::integer
          else ${config.VERSION_RETENTION_DAYS}::integer
        end * interval '1 day'
      )
    returning
      ${entryVersions.id} as id,
      ${entryVersions.entryID} as "entryID",
      ${entryVersions.workspaceID} as "workspaceID"
  `);
  const versionsByWorkspace = new Map<string, Array<{ entryID: string; id: string }>>();

  for (const version of deleted.rows) {
    const versions = versionsByWorkspace.get(version.workspaceID) || [];

    versions.push({ entryID: toEntryID(version.entryID), id: toVersionID(version.id) });
    versionsByWorkspace.set(version.workspaceID, versions);
  }

  for (const [workspaceID, versions] of versionsByWorkspace) {
    emitVersionDeletionEvents(toWorkspaceID(workspaceID), versions);
  }
};
const runAutomaticVersionQueue = async (): Promise<void> => {
  const candidates = await db
    .select({
      entryID: entryVersionActivity.entryID,
      workspaceID: entryVersionActivity.workspaceID,
      deletedAt: entries.deletedAt
    })
    .from(entryVersionActivity)
    .innerJoin(
      entries,
      and(
        eq(entries.id, entryVersionActivity.entryID),
        eq(entries.workspaceID, entryVersionActivity.workspaceID)
      )
    )
    .where(lte(entryVersionActivity.dueAt, new Date()))
    .orderBy(entryVersionActivity.dueAt)
    .limit(AUTOMATIC_VERSION_BATCH_SIZE);

  for (const candidate of candidates) {
    try {
      await processActivity(candidate);
    } catch (error) {
      console.error("Failed to create an automatic version", {
        error,
        entryID: candidate.entryID
      });
    }
  }

  await deleteExpiredAutomaticVersions();
};
const checkAutomaticVersionQueue = (): void => {
  if (automaticVersionRun) return;

  automaticVersionRun = runAutomaticVersionQueue()
    .catch((error) => {
      console.error("Automatic version queue check failed", { error });
    })
    .finally(() => {
      automaticVersionRun = undefined;
    });
};
const startAutomaticVersionQueue = (): void => {
  if (automaticVersionInterval) return;

  checkAutomaticVersionQueue();
  automaticVersionInterval = setInterval(
    checkAutomaticVersionQueue,
    AUTOMATIC_VERSION_QUEUE_INTERVAL_MS
  );
  automaticVersionInterval.unref();
};
const stopAutomaticVersionQueue = async (): Promise<void> => {
  if (automaticVersionInterval) clearInterval(automaticVersionInterval);

  automaticVersionInterval = undefined;
  await automaticVersionRun;
};

export { startAutomaticVersionQueue, stopAutomaticVersionQueue };
