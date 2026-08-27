import { revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createContext, createSignal, type ParentComponent, useContext } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { usePublishing } from "#web/context/publishing";
import { client } from "#web/lib/api";
import { publishingPublicationsQuery, publishingStatusQuery } from "#web/lib/data";

interface PublishingTargetItem {
  id: string;
  label: string;
  restricted?: boolean;
}
interface PublishingTarget {
  items: PublishingTargetItem[];
  type: "collection" | "entry";
}
interface PublishingActionState {
  action: PublishingAction;
  channel: string;
  target: PublishingTarget;
}
interface PublishingMutationInput extends PublishingActionState {
  publishOnEnable?: boolean;
}
interface PublishingActionsContextValue {
  open(action: PublishingAction, target: PublishingTarget, channel?: string): void;
}

type PublishingAction = "disable" | "enable" | "publish" | "unpublish";

const PUBLISHED_CHANNEL = "published";
const ACTION_LABELS: Record<PublishingAction, string> = {
  disable: "Publishing disabled",
  enable: "Publishing enabled",
  publish: "Content published",
  unpublish: "Content unpublished"
};
const ACTION_ERROR_LABELS: Record<PublishingAction, string> = {
  disable: "Failed to disable publishing",
  enable: "Failed to enable publishing",
  publish: "Failed to publish content",
  unpublish: "Failed to unpublish content"
};
const PublishingActionsContext = createContext<PublishingActionsContextValue>();
const PublishingActionsProvider: ParentComponent = (props) => {
  const notify = useNotify();
  const publishing = usePublishing();
  const [opened, setOpened] = createSignal(false);
  const [state, setState] = createSignal<PublishingActionState>({
    action: "publish",
    channel: PUBLISHED_CHANNEL,
    target: { items: [], type: "entry" }
  });
  const mutation = createMutation(() => ({
    mutationFn: async (input: PublishingMutationInput) => {
      const ids = input.target.items.map((item) => item.id);

      if (input.target.type === "entry") {
        if (input.action === "publish") {
          if (ids.length === 1) {
            await client.publishing.publishEntry({ entryID: ids[0], channel: input.channel });
          } else {
            await client.publishing.bulkPublishEntries({
              entries: ids.map((entryID) => ({ entryID })),
              channel: input.channel
            });
          }
          return;
        }

        if (ids.length === 1) {
          await client.publishing.unpublishEntry({ entryID: ids[0], channel: input.channel });
        } else {
          await client.publishing.bulkUnpublishEntries({ ids, channel: input.channel });
        }
        return;
      }

      if (input.action === "enable" || input.action === "disable") {
        const collectionInput = {
          enabled: input.action === "enable",
          publish: input.action === "enable" ? input.publishOnEnable : undefined
        };

        if (ids.length === 1) {
          await client.publishing.setCollection({ collectionID: ids[0], ...collectionInput });
        } else {
          await client.publishing.bulkSetCollections({ ids, ...collectionInput });
        }
        return;
      }

      if (input.action === "publish") {
        if (ids.length === 1) {
          await client.publishing.publishCollection({
            collectionID: ids[0],
            channel: input.channel
          });
        } else {
          await client.publishing.bulkPublishCollections({ ids, channel: input.channel });
        }
        return;
      }

      if (ids.length === 1) {
        await client.publishing.unpublishCollection({
          collectionID: ids[0],
          channel: input.channel
        });
      } else {
        await client.publishing.bulkUnpublishCollections({ ids, channel: input.channel });
      }
    },
    onSuccess: (_data, input) => {
      setOpened(false);
      void revalidate(publishingPublicationsQuery.key);
      void revalidate(publishingStatusQuery.key);
      const channelAction = input.action === "publish" || input.action === "unpublish";
      const text = channelAction
        ? `${ACTION_LABELS[input.action]} ${input.action === "publish" ? "to" : "from"} ${publishing.getChannelName(input.channel)}`
        : ACTION_LABELS[input.action];

      notify({ type: "success", text });
    },
    onError: (error, input) => {
      console.error(error);
      notify({ type: "error", text: ACTION_ERROR_LABELS[input.action] });
    }
  }));
  const open = (
    action: PublishingAction,
    target: PublishingTarget,
    channel = publishing.channel()
  ) => {
    setState({ action, channel, target });
    setOpened(true);
  };
  const close = () => {
    if (!mutation.isPending) setOpened(false);
  };
  const confirm = (publishOnEnable?: boolean) => {
    mutation.mutate({ ...state(), publishOnEnable });
  };
  const title = () => {
    const action = state().action;
    const count = state().target.items.length;
    const target = state().target.type === "collection" ? "groups" : "entries";

    if (action === "enable")
      return count > 1 ? `Enable publishing for ${count} groups?` : "Enable publishing?";
    if (action === "disable")
      return count > 1 ? `Disable publishing for ${count} groups?` : "Disable publishing?";
    if (action === "publish")
      return count > 1 ? `Publish ${count} ${target}?` : "Publish current content?";

    return count > 1 ? `Unpublish ${count} ${target}?` : "Unpublish content?";
  };
  const description = () => {
    const { action, channel, target } = state();
    const collection = target.type === "collection";
    const multiple = target.items.length > 1;
    const channelName = publishing.getChannelName(channel);

    if (action === "enable") {
      return multiple
        ? "Enable publishing for these groups and their descendants. Choose whether to publish their current content now."
        : "Enable publishing for this group and its descendants. Choose whether to publish its current content now.";
    }

    if (action === "disable") {
      return `Entries that are not covered by another enabled group will be unpublished.`;
    }

    if (action === "publish") {
      return collection
        ? `Publish the current content of all entries in ${multiple ? "these groups" : "this group"} and ${multiple ? "their" : "its"} descendants to the ${channelName} channel.`
        : `Publish the current ${multiple ? "documents" : "document"} to the ${channelName} channel.`;
    }

    return collection
      ? `Remove all entries in ${multiple ? "these groups" : "this group"} and ${multiple ? "their" : "its"} descendants from the ${channelName} channel.`
      : `Remove ${multiple ? "these entries" : "this entry"} from the ${channelName} channel.`;
  };
  const confirmLabel = () => {
    const action = state().action;

    if (action === "enable") return "Enable and publish";
    if (action === "disable") return "Disable publishing";
    if (action === "publish") return "Publish";

    return "Unpublish";
  };
  return (
    <PublishingActionsContext.Provider value={{ open }}>
      {props.children}
      <ActionConfirmationDialog
        opened={opened()}
        title={title()}
        description={description()}
        affected={state().target.items.map((item) => ({
          id: item.id,
          icon: state().target.type === "collection" ? "i-lucide:folder" : "i-lucide:file-text",
          label: item.label
        }))}
        action={{
          color:
            state().action === "disable" || state().action === "unpublish" ? "danger" : "primary",
          icon:
            state().action === "enable"
              ? "i-material-symbols:publish-rounded"
              : state().action === "disable"
                ? "i-lucide:radio-off"
                : state().action === "publish"
                  ? "i-material-symbols:publish-rounded"
                  : "i-material-symbols:unpublished-outline-rounded",
          label: confirmLabel(),
          loading: mutation.isPending,
          onClick: () => confirm(true)
        }}
        secondaryAction={
          state().action === "enable"
            ? {
                icon: "i-lucide:radio",
                label: "Enable only",
                onClick: () => confirm(false)
              }
            : undefined
        }
        onClose={close}
      />
    </PublishingActionsContext.Provider>
  );
};

const usePublishingActions = () => useContext(PublishingActionsContext)!;

export { PublishingActionsProvider, usePublishingActions };
export type { PublishingAction, PublishingTarget };
