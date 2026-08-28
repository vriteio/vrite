import {
  isCollectionPublishingEnabled,
  loadPublishingTree,
  publishEntries,
  type PublishEntryTarget,
  syncEntrySnapshots
} from "#backend/lib/publishing";
import {
  type EntryAuthorizationSource,
  loadEntryAuthorizationSources,
  withAuthorization
} from "#backend/lib/policy";
import { toUUID } from "#backend/lib/primitives";
import { ORPCError } from "@orpc/server";

interface PublishEntryInput {
  entries: PublishEntryTarget[];
  channel: string;
  contributorIDs: string[];
}
interface ResolvedPublishEntry {
  entrySources: EntryAuthorizationSource[];
  publishingEntries: PublishEntryTarget[];
}

type PublishEntryResult = Awaited<ReturnType<typeof publishEntries>>;

const normalizePublishingEntries = (entries: PublishEntryTarget[]): PublishEntryTarget[] => {
  const entriesByID = new Map<string, PublishEntryTarget>();

  for (const entry of entries) {
    const entryID = toUUID(entry.entryID);
    const versionID = entry.versionID ? toUUID(entry.versionID) : undefined;
    const existingEntry = entriesByID.get(entryID);

    if (existingEntry && existingEntry.versionID !== versionID) {
      throw new ORPCError("BAD_REQUEST", { message: "Conflicting entry publishing targets" });
    }

    entriesByID.set(entryID, { entryID, versionID });
  }

  return [...entriesByID.values()];
};
const commitPublishEntry = withAuthorization<
  PublishEntryInput,
  ResolvedPublishEntry,
  PublishEntryResult
>(
  {
    actions: ({ resolved }) => ({
      entries: resolved.entrySources.map(({ collectionID }) => ({
        action: "publishing:publish",
        collectionID
      }))
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const publishingEntries = normalizePublishingEntries(input.entries);
      const entrySources = await loadEntryAuthorizationSources({
        database,
        entryIDs: publishingEntries.map((entry) => entry.entryID),
        workspaceID
      });

      return { entrySources, publishingEntries };
    },
    transaction: "locked-workspace"
  },
  async ({ database, input, resolved, workspaceID }) => {
    const { entrySources, publishingEntries } = resolved;

    const tree = await loadPublishingTree(database, workspaceID);

    if (
      entrySources.some((entry) => !isCollectionPublishingEnabled(tree, entry.collectionID || null))
    ) {
      throw new ORPCError("BAD_REQUEST", { message: "Publishing is not enabled for this entry" });
    }

    return publishEntries(database, {
      workspaceID,
      entries: publishingEntries,
      channel: input.channel,
      contributorIDs: input.contributorIDs
    });
  }
);
const publishEntry = withAuthorization<PublishEntryInput, ResolvedPublishEntry, PublishEntryResult>(
  {
    actions: ({ resolved }) => ({
      entries: resolved.entrySources.map(({ collectionID }) => ({
        action: "publishing:publish",
        collectionID
      }))
    }),
    resolve: async ({ database, input, workspaceID }) => {
      const publishingEntries = normalizePublishingEntries(input.entries);
      const entrySources = await loadEntryAuthorizationSources({
        database,
        entryIDs: publishingEntries.map((entry) => entry.entryID),
        workspaceID
      });

      return { entrySources, publishingEntries };
    },
    transaction: "locked-workspace"
  },
  async ({ auth, authorizationScope, input, resolved, workspaceID }) => {
    const { publishingEntries } = resolved;
    const currentEntryIDs = publishingEntries.flatMap((entry) => {
      return entry.versionID ? [] : [entry.entryID];
    });

    await syncEntrySnapshots(workspaceID, currentEntryIDs);

    return commitPublishEntry({
      ...input,
      auth,
      skipAuthorization: authorizationScope
    });
  }
);

export { publishEntry };
