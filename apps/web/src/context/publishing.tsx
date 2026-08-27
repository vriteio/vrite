import { createAsync, revalidate, useSearchParams } from "@solidjs/router";
import {
  type Accessor,
  createContext,
  createEffect,
  createMemo,
  onCleanup,
  type ParentComponent,
  useContext
} from "solid-js";
import {
  type PublishingChannel,
  publishingChannelsQuery,
  publishingPublicationsQuery,
  publishingStatusQuery
} from "#web/lib/data";
import { useWorkspace } from "./workspace";
import { type WorkspaceContentOperationsInput } from "./workspace/operations/types";

interface PublishingState {
  enabledCollectionIDs: Set<string>;
  unpublishedEntryIDs: Set<string>;
}
interface WorkspacePublishingOperationsInput extends WorkspaceContentOperationsInput {
  publishing: Accessor<PublishingState | null>;
}
interface PublishingContextValue {
  channel(): string;
  channels(): PublishingChannel[];
  channelsError(): boolean;
  channelsLoading(): boolean;
  getCollectionUnpublishedCount(collectionID: string): number;
  getChannelName(code?: string): string;
  getEntryPublishingStatus(entryID: string): ChannelPublishingStatus | null;
  retry(): void;
  setChannel(channel: string): void;
  statusError(): boolean;
  statusLoading(): boolean;
}
interface PublishingChannelsResult {
  error?: true;
  result?: PublishingChannel[];
}

type ChannelPublishingStatus = "error" | "loading" | "outside" | "published" | "unpublished";
type EntryPublishingStatus = "outside" | "published" | "unpublished";

const PUBLISHED_CHANNEL = "published";
const PublishingContext = createContext<PublishingContextValue>();

const PublishingProvider: ParentComponent = (props) => {
  const { content, subscribeToUpdates } = useWorkspace();
  const [searchParams, setSearchParams] = useSearchParams();
  const channel = () => {
    const value = searchParams.channel;

    return typeof value === "string" ? value : PUBLISHED_CHANNEL;
  };
  const canRead = () => content.hasPermissionInAnyCollection("read:publishing");
  const channelList = createAsync(async (): Promise<PublishingChannelsResult> => {
    if (!canRead()) return { result: [] };

    try {
      return { result: await publishingChannelsQuery() };
    } catch (error) {
      console.error(error);
      return { error: true };
    }
  });
  const customStatus = createAsync(async () => {
    const selectedChannel = channel();

    if (!canRead() || selectedChannel === PUBLISHED_CHANNEL) return null;

    return {
      channel: selectedChannel,
      response: await publishingStatusQuery({ channel: selectedChannel })
    };
  });
  const channelResult = () => channelList.latest;
  const customStatusResult = () => {
    const latest = customStatus.latest;

    return latest?.channel === channel() ? latest.response : undefined;
  };
  const unpublishedEntryIDs = createMemo(() => {
    if (channel() === PUBLISHED_CHANNEL) {
      return content.publishing()?.unpublishedEntryIDs || new Set<string>();
    }

    return new Set(customStatusResult()?.result?.unpublishedEntryIDs || []);
  });
  const channels = () => channelResult()?.result || [];
  const channelsLoading = () => canRead() && channelResult() === undefined;
  const channelsError = () => Boolean(channelResult()?.error);
  const statusLoading = () => {
    return channel() !== PUBLISHED_CHANNEL && canRead() && customStatusResult() === undefined;
  };
  const statusError = () => Boolean(customStatusResult()?.error);
  const getChannelName = (code = channel()) => {
    return channels().find((availableChannel) => availableChannel.code === code)?.name || code;
  };
  const setChannel = (nextChannel: string) => {
    setSearchParams(
      { channel: nextChannel === PUBLISHED_CHANNEL ? undefined : nextChannel },
      { replace: true }
    );
  };
  const retry = () => {
    void revalidate(publishingChannelsQuery.key);

    if (channel() !== PUBLISHED_CHANNEL) {
      void revalidate(publishingStatusQuery.keyFor({ channel: channel() }));
    }
  };
  const getEntryPublishingStatus = (entryID: string): ChannelPublishingStatus | null => {
    const baseStatus = content.getEntryPublishingStatus(entryID);

    if (!baseStatus || baseStatus === "outside" || channel() === PUBLISHED_CHANNEL) {
      return baseStatus;
    }

    if (statusLoading()) return "loading";
    if (statusError()) return "error";

    return unpublishedEntryIDs().has(entryID) ? "unpublished" : "published";
  };
  const getCollectionUnpublishedCount = (collectionID: string) => {
    if (channel() === PUBLISHED_CHANNEL) {
      return content.getCollectionUnpublishedCount(collectionID);
    }

    if (statusLoading() || statusError()) return 0;

    const collections = content.collectionsCollection().find().fetch();
    const collectionsByID = new Map(collections.map((collection) => [collection.id, collection]));
    let count = 0;

    for (const entryID of unpublishedEntryIDs()) {
      const entry = content.entriesCollection().findOne({ id: entryID });
      const collection = entry?.collectionID ? collectionsByID.get(entry.collectionID) : undefined;

      if (collection && [collection.id, ...collection.ancestors].includes(collectionID)) {
        count += 1;
      }
    }

    return count;
  };

  createEffect(() => {
    const result = channelResult();
    const selectedChannel = channel();

    if (
      !result?.result ||
      selectedChannel === PUBLISHED_CHANNEL ||
      result.result.some((availableChannel) => availableChannel.code === selectedChannel)
    ) {
      return;
    }

    setChannel(PUBLISHED_CHANNEL);
  });

  const unsubscribeFromUpdates = subscribeToUpdates((event) => {
    if (event.action.startsWith("publishing:channel-")) {
      void revalidate(publishingChannelsQuery.key);
      void revalidate(publishingPublicationsQuery.key);
      return;
    }

    if (event.action === "publishing:entries-update" && event.data.entries.length > 0) {
      void revalidate(
        event.data.entries.map((entry) => {
          return publishingPublicationsQuery.keyFor({ entryID: entry.entryID });
        })
      );

      if (channel() !== PUBLISHED_CHANNEL && event.data.channel === channel()) {
        void revalidate(publishingStatusQuery.keyFor({ channel: channel() }));
      }
    }
  });

  onCleanup(unsubscribeFromUpdates);

  return (
    <PublishingContext.Provider
      value={{
        channel,
        channels,
        channelsError,
        channelsLoading,
        getCollectionUnpublishedCount,
        getChannelName,
        getEntryPublishingStatus,
        retry,
        setChannel,
        statusError,
        statusLoading
      }}
    >
      {props.children}
    </PublishingContext.Provider>
  );
};

const createWorkspacePublishingOperations = (input: WorkspacePublishingOperationsInput) => {
  const effectiveCollectionIDs = createMemo(() => {
    const publishing = input.publishing();

    if (!publishing) return null;

    const enabledCollectionIDs = publishing.enabledCollectionIDs;
    const collections = input.collectionsCollection().find().fetch();

    return new Set(
      collections
        .filter((collection) => {
          return [collection.id, ...collection.ancestors].some((collectionID) => {
            return enabledCollectionIDs.has(collectionID);
          });
        })
        .map((collection) => collection.id)
    );
  });
  const collectionUnpublishedCounts = createMemo(() => {
    const publishing = input.publishing();
    const counts = new Map<string, number>();

    if (!publishing) return counts;

    const collections = input.collectionsCollection().find().fetch();
    const collectionsByID = new Map(collections.map((collection) => [collection.id, collection]));
    const entries = input.entriesCollection().find().fetch();

    for (const entry of entries) {
      if (!entry.collectionID || !publishing.unpublishedEntryIDs.has(entry.id)) continue;

      const collection = collectionsByID.get(entry.collectionID);

      if (!collection) continue;

      for (const collectionID of [collection.id, ...collection.ancestors]) {
        counts.set(collectionID, (counts.get(collectionID) ?? 0) + 1);
      }
    }

    return counts;
  });
  const isCollectionPublishingEnabled = (collectionID: string) => {
    return effectiveCollectionIDs()?.has(collectionID) ?? false;
  };
  const isCollectionPublishingRoot = (collectionID: string) => {
    const publishing = input.publishing();
    const collection = input.collectionsCollection().findOne({ id: collectionID });

    if (!publishing || !collection || !publishing.enabledCollectionIDs.has(collectionID)) {
      return false;
    }

    return !collection.ancestors.some((ancestorID) => {
      return publishing.enabledCollectionIDs.has(ancestorID);
    });
  };
  const isCollectionPublishingExplicitlyEnabled = (collectionID: string) => {
    return input.publishing()?.enabledCollectionIDs.has(collectionID) ?? false;
  };
  const getCollectionUnpublishedCount = (collectionID: string) => {
    return collectionUnpublishedCounts().get(collectionID) ?? 0;
  };
  const getEntryPublishingStatus = (entryID: string): EntryPublishingStatus | null => {
    const publishing = input.publishing();
    const entry = input.entriesCollection().findOne({ id: entryID });

    if (!publishing || !entry) return null;
    if (!entry.collectionID || !isCollectionPublishingEnabled(entry.collectionID)) return "outside";
    if (publishing.unpublishedEntryIDs.has(entryID)) return "unpublished";

    return "published";
  };

  return {
    getCollectionUnpublishedCount,
    getEntryPublishingStatus,
    isCollectionPublishingEnabled,
    isCollectionPublishingExplicitlyEnabled,
    isCollectionPublishingRoot
  };
};
const usePublishing = () => useContext(PublishingContext)!;

export { createWorkspacePublishingOperations, PublishingProvider, usePublishing };
export type { ChannelPublishingStatus, EntryPublishingStatus, PublishingState };
