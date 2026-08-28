import { revalidate } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createContext, type ParentComponent, useContext } from "solid-js";
import { useNotify } from "#web/context/notifications";
import { usePublishing } from "#web/context/publishing";
import { client } from "#web/lib/api";
import { publishingPublicationsQuery, publishingStatusQuery } from "#web/lib/data";

interface PublishingTarget {
  ids: string[];
  type: "collection" | "entry";
}
interface PublishingMutationInput {
  action: PublishingAction;
  channel: string;
  target: PublishingTarget;
}
interface PublishingActionsContextValue {
  open(action: PublishingAction, target: PublishingTarget, channel?: string): void;
}

type PublishingAction = "disable" | "enable" | "publish" | "unpublish";
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
  const mutation = createMutation(() => ({
    mutationFn: async (input: PublishingMutationInput) => {
      const ids = input.target.ids;

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
          publish: input.action === "enable" ? false : undefined
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
    onSuccess: () => {
      void revalidate(publishingPublicationsQuery.key);
      void revalidate(publishingStatusQuery.key);
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
    if (!mutation.isPending) mutation.mutate({ action, channel, target });
  };
  return (
    <PublishingActionsContext.Provider value={{ open }}>
      {props.children}
    </PublishingActionsContext.Provider>
  );
};

const usePublishingActions = () => useContext(PublishingActionsContext)!;

export { PublishingActionsProvider, usePublishingActions };
export type { PublishingAction, PublishingTarget };
