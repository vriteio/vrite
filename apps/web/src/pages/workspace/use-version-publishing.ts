import { createAsync, revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { type Accessor, createEffect, createMemo, createSignal, on, useTransition } from "solid-js";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { usePublishing } from "#web/context/publishing";
import { client } from "#web/lib/api";
import {
  type PublishingPublication,
  publishingPublicationsQuery,
  publishingStatusQuery,
  type VersionSummary
} from "#web/lib/data";

interface UseVersionPublishingInput {
  entryID: Accessor<string>;
  opened: Accessor<boolean>;
  versions: Accessor<VersionSummary[]>;
}
interface PublishingPublicationsResult {
  entryID: string;
  error?: true;
  result?: PublishingPublication[];
}
interface VisiblePublication {
  channel: string;
  version: VersionSummary;
}
interface VersionPublishingAction {
  action: "assign" | "unpublish";
  channel: string;
  version: VersionSummary;
}
interface VersionPublishingMutationInput extends VersionPublishingAction {
  entryID: string;
}

const useVersionPublishing = (input: UseVersionPublishingInput) => {
  const { content, hasPermission } = useWorkspace();
  const publishing = usePublishing();
  const notify = useNotify();
  const [action, setAction] = createSignal<VersionPublishingAction | null>(null);
  const [publicationsRefreshing, startPublicationsRefresh] = useTransition();
  const canRead = () => hasPermission("read:publishing");
  const publishingEnabled = () => {
    const status = content.getEntryPublishingStatus(input.entryID());

    return status !== null && status !== "outside";
  };
  const canManage = () => {
    return (
      hasPermission("publishing") && publishingEnabled() && !content.offline() && !content.syncing()
    );
  };
  const publications = createAsync(
    async (): Promise<PublishingPublicationsResult | null> => {
      const entryID = input.entryID();

      if (!input.opened() || !entryID || !canRead()) return null;

      try {
        return {
          entryID,
          result: await publishingPublicationsQuery({ entryID })
        };
      } catch (error) {
        console.error(error);
        return { entryID, error: true };
      }
    },
    { deferStream: true }
  );
  const publicationResult = () => {
    const latest = publications.latest;

    return latest?.entryID === input.entryID() ? latest.result || [] : [];
  };
  const queryError = () => {
    const publication = publications.latest;

    return Boolean(
      publishing.channelsError() || (publication?.entryID === input.entryID() && publication.error)
    );
  };
  const queryLoading = () => {
    const publication = publications.latest;

    return (
      input.opened() &&
      canRead() &&
      (publishing.channelsLoading() || publication?.entryID !== input.entryID())
    );
  };
  const canManagePublications = () => canManage() && !queryError() && !queryLoading();
  const refresh = (onRevalidated = () => {}) => {
    const entryID = input.entryID();

    if (!entryID || !canRead()) return;

    void startPublicationsRefresh(() => {
      void (async () => {
        await revalidate(publishingPublicationsQuery.keyFor({ entryID }));
        onRevalidated();
      })();
    });
  };
  const mutation = createMutation(() => ({
    mutationFn: async (mutationInput: VersionPublishingMutationInput) => {
      if (mutationInput.action === "assign") {
        await client.publishing.publishEntry({
          entryID: mutationInput.entryID,
          versionID: mutationInput.version.id,
          channel: mutationInput.channel
        });
        return;
      }

      await client.publishing.unpublishEntry({
        entryID: mutationInput.entryID,
        versionID: mutationInput.version.id,
        channel: mutationInput.channel
      });
    },
    onSuccess: (_data, mutationInput) => {
      setAction(null);
      refresh(() => mutation.reset());
      void revalidate(publishingStatusQuery.keyFor({ channel: mutationInput.channel }));
      notify({
        type: "success",
        text:
          mutationInput.action === "assign"
            ? `Version assigned to ${publishing.getChannelName(mutationInput.channel)}`
            : `Version unpublished from ${publishing.getChannelName(mutationInput.channel)}`
      });
    },
    onError: (error, mutationInput) => {
      console.error(error);
      refresh(() => mutation.reset());
      notify({
        type: "error",
        text:
          mutationInput.action === "assign"
            ? `Failed to assign version to ${publishing.getChannelName(mutationInput.channel)}`
            : `Failed to unpublish version from ${publishing.getChannelName(mutationInput.channel)}`
      });
    }
  }));
  const visiblePublications = createMemo<VisiblePublication[]>(() => {
    const variables = mutation.variables;
    const currentPublications = publicationResult().map((publication) => ({
      channel: publication.channel.code,
      version: publication.version
    }));

    if (!(mutation.isPending || mutation.isSuccess || publicationsRefreshing()) || !variables) {
      return currentPublications;
    }

    const otherPublications = currentPublications.filter((publication) => {
      return publication.channel !== variables.channel;
    });

    if (variables.action === "unpublish") return otherPublications;

    return [
      ...otherPublications,
      {
        channel: variables.channel,
        version: variables.version
      }
    ];
  });
  const channelsByVersionID = createMemo(() => {
    const channels = new Map<string, string[]>();

    for (const publication of visiblePublications()) {
      const assignedChannels = channels.get(publication.version.id) || [];

      assignedChannels.push(publication.channel);
      channels.set(publication.version.id, assignedChannels);
    }

    return channels;
  });
  const dialogTitle = () => {
    return action()?.action === "assign"
      ? "Publish version to channel?"
      : "Unpublish version from channel?";
  };
  const dialogDescription = () => {
    const currentAction = action();

    if (!currentAction) return "";

    if (currentAction.action === "assign") {
      const assignedVersionID = publicationResult().find((publication) => {
        return publication.channel.code === currentAction.channel;
      })?.version.id;
      const assignedVersion = input.versions().find((version) => version.id === assignedVersionID);
      const replacement = assignedVersion
        ? ` This replaces ${assignedVersion.name || assignedVersion.entryName}.`
        : assignedVersionID
          ? " This replaces the existing publication."
          : "";

      return `Assign this version to the "${publishing.getChannelName(currentAction.channel)}" channel, replacing assigned ${replacement} version.`;
    }

    return `Remove this entry from the ${publishing.getChannelName(currentAction.channel)} channel.`;
  };
  const affected = () => {
    const currentAction = action();

    if (!currentAction) return [];

    return [
      {
        id: currentAction.version.id,
        icon: "i-lucide:history",
        label: currentAction.version.name || currentAction.version.entryName,
        detail: `Channel: ${publishing.getChannelName(currentAction.channel)}`
      }
    ];
  };
  const assign = (version: VersionSummary, channel: string) => {
    setAction({ action: "assign", channel, version });
  };
  const unpublish = (version: VersionSummary, channel: string) => {
    setAction({ action: "unpublish", channel, version });
  };
  const close = () => {
    if (!mutation.isPending) setAction(null);
  };
  const confirm = () => {
    const currentAction = action();

    if (currentAction) {
      mutation.mutate({ ...currentAction, entryID: input.entryID() });
    }
  };

  createEffect(on(input.entryID, () => setAction(null)));

  return {
    action,
    affected,
    assignedChannels: (versionID: string) => channelsByVersionID().get(versionID) || [],
    assign,
    canManage: canManagePublications,
    close,
    confirm,
    dialogDescription,
    dialogTitle,
    loading: () => mutation.isPending,
    queryError,
    queryLoading,
    retry: () => {
      publishing.retry();
      refresh();
    },
    unpublish
  };
};

export { useVersionPublishing };
