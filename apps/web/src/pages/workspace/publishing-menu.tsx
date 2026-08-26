import {
  Button,
  DropdownMenu,
  type MenuItem,
  Spinner,
  Tooltip,
  useDropdown
} from "@andesine/components";
import { createAsync, revalidate, useSearchParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import clsx from "clsx";
import { format, formatDistanceToNow } from "date-fns";
import { type Component, createMemo, createSignal, type JSX, Show } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { usePublishing } from "#web/context/publishing";
import { client } from "#web/lib/api";
import {
  type PublishingPublication,
  publishingPublicationsQuery,
  publishingStatusQuery,
  type VersionReason
} from "#web/lib/data";

interface PublishingMenuProps {
  entryID: string;
  triggerVariant?: "menu" | "toolbar";
}
interface PublishingStatusIconProps {
  status: PublishingDisplayStatus;
  size?: "default" | "large";
}
interface PublishingMutationInput {
  action: PublishingAction;
  channel: string;
}
interface PublishingPublicationsResult {
  entryID: string;
  error?: true;
  result?: PublishingPublication[];
}
interface VersionReasonDetails {
  icon: string;
  label: string;
}

type PublishingAction = "publish" | "unpublish";
type PublishingDisplayStatus =
  "changes" | "error" | "loading" | "not-published" | "published" | "unpublished";
type PublishingMenuItem = MenuItem | (() => JSX.Element);

const PUBLISHED_CHANNEL = "published";
const STATUS_LABELS: Record<PublishingDisplayStatus, string> = {
  "changes": "Unpublished changes",
  "error": "Status unavailable",
  "loading": "Loading",
  "not-published": "Publish",
  "published": "Published",
  "unpublished": "Unpublished"
};
const VERSION_REASON_DETAILS: Record<VersionReason, VersionReasonDetails> = {
  auto: { icon: "i-lucide:circle-dot-dashed", label: "Automatic" },
  manual: { icon: "i-lucide:circle-dot", label: "Manual" },
  revert: { icon: "i-lucide:refresh-ccw-dot", label: "Revert" }
};
const PublishingStatusIcon: Component<PublishingStatusIconProps> = (props) => {
  const large = () => props.size === "large";

  return (
    <div class={clsx("flex items-center justify-center", large() ? "h-6 w-6" : "h-5 w-5")}>
      <Show
        when={props.status !== "loading"}
        fallback={
          <Spinner class={clsx("shrink-0 text-gray-400", large() ? "h-5 w-5" : "h-4 w-4")} />
        }
      >
        <div
          class={clsx(large() ? "h-5 w-5" : "h-4.5 w-4.5", "shrink-0", {
            "i-material-symbols:check-circle-outline-rounded text-green-500":
              props.status === "published",
            "i-lucide:triangle-alert text-red-500": props.status === "error",
            "i-material-symbols:published-with-changes-rounded text-amber-500":
              props.status === "changes" || props.status === "unpublished",
            "i-material-symbols:publish-rounded text-gray-400": props.status === "not-published"
          })}
        />
      </Show>
    </div>
  );
};

const PublishingMenu: Component<PublishingMenuProps> = (props) => {
  const { content, hasPermission } = useWorkspace();
  const publishing = usePublishing();
  const { closeMobileDropdowns } = useDropdown();
  const [, setSearchParams] = useSearchParams();
  const notify = useNotify();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const [action, setAction] = createSignal<PublishingAction | null>(null);
  const selectedChannel = publishing.channel;
  const baseStatus = () => content.getEntryPublishingStatus(props.entryID);
  const publishingEnabled = () => baseStatus() !== null && baseStatus() !== "outside";
  const entry = () => content.entries.get({ entryID: props.entryID });
  const channelOptions = createMemo(() => {
    const channelCodes = new Set<string>([PUBLISHED_CHANNEL, selectedChannel()]);

    for (const channel of publishing.channels()) {
      channelCodes.add(channel.code);
    }

    return [...channelCodes];
  });
  const status = () => publishing.getEntryPublishingStatus(props.entryID);
  const publications = createAsync(
    async (): Promise<PublishingPublicationsResult | null> => {
      const entryID = props.entryID;

      if (!entryID || !publishingEnabled()) return null;

      try {
        return { entryID, result: await publishingPublicationsQuery({ entryID }) };
      } catch (error) {
        console.error(error);
        return { entryID, error: true };
      }
    },
    { deferStream: true }
  );
  const publicationResponse = () => {
    const latest = publications.latest;

    return latest?.entryID === props.entryID ? latest : undefined;
  };
  const publication = () => {
    return publicationResponse()?.result?.find((currentPublication) => {
      return currentPublication.channel.code === selectedChannel();
    });
  };
  const version = () => publication()?.version;
  const displayStatus = (): PublishingDisplayStatus | null => {
    const currentStatus = status();

    if (!currentStatus || currentStatus === "outside") return null;

    if (currentStatus === "error" || currentStatus === "loading" || currentStatus === "published") {
      return currentStatus;
    }

    if (!publicationResponse()) return "loading";
    if (publicationResponse()?.error) return "error";
    if (version()) return "changes";
    if (publicationResponse()?.result) return "not-published";

    return "unpublished";
  };

  const revalidateChannel = (channel = selectedChannel()) => {
    void revalidate(publishingPublicationsQuery.keyFor({ entryID: props.entryID }));

    if (channel !== PUBLISHED_CHANNEL) {
      void revalidate(publishingStatusQuery.keyFor({ channel }));
    }
  };
  const actionMutation = createMutation(() => ({
    mutationFn: async (input: PublishingMutationInput) => {
      if (input.action === "publish") {
        await client.publishing.publishEntry({
          entryID: props.entryID,
          channel: input.channel
        });
      } else {
        await client.publishing.unpublishEntry({
          entryID: props.entryID,
          channel: input.channel
        });
      }
    },
    onSuccess: (_data, input) => {
      setAction(null);
      revalidateChannel(input.channel);
      notify({
        type: "success",
        text:
          input.action === "publish"
            ? `Current document published to ${publishing.getChannelName(input.channel)}`
            : `Content unpublished from ${publishing.getChannelName(input.channel)}`
      });
    },
    onError: (error, input) => {
      console.error(error);
      notify({
        type: "error",
        text:
          input.action === "publish"
            ? "Failed to publish current document"
            : "Failed to unpublish content"
      });
    }
  }));
  const openAssignedVersion = () => {
    const currentVersion = version();

    if (!currentVersion) return;

    setMenuOpened(false);
    setSearchParams({
      version: currentVersion.id,
      compare: undefined,
      compareView: undefined
    });
    closeMobileDropdowns();
  };
  const renderAssignedVersion = () => {
    const createdAt = () => new Date(version()?.createdAt || Date.now());
    const reason = () => VERSION_REASON_DETAILS[version()?.reason || "manual"];

    return (
      <Tooltip
        content={
          <div class="flex flex-col items-start justify-center gap-1">
            <span>{format(createdAt(), "MMM d, yyyy HH:mm:ss")}</span>
            <span class="font-mono text-[80%] opacity-50">{reason().label}</span>
          </div>
        }
        enabled={menuOpened()}
        placement="right"
        wrapperClass="w-full"
      >
        <div
          class="flex min-h-10 w-full cursor-pointer items-start gap-1 rounded-md px-1 py-0.5 text-left focus:outline-none @hover:bg-gray-100 md:min-h-0"
          onClick={openAssignedVersion}
        >
          <div class={clsx("h-5 w-5 shrink-0 text-gray-500 md:h-4.5 md:w-4.5", reason().icon)} />
          <div class="flex min-w-0 flex-1 flex-col px-1 leading-tight">
            <span
              class={clsx(
                "truncate text-[16px] md:text-sm",
                version() ? "text-gray-700" : "text-gray-400"
              )}
            >
              {version()?.name || version()?.entryName || "No version assigned"}
            </span>
            <Show when={version()}>
              <span class="truncate text-sm font-normal text-gray-400 md:text-xs">
                {formatDistanceToNow(createdAt(), { addSuffix: true })}
              </span>
            </Show>
          </div>
        </div>
      </Tooltip>
    );
  };
  const options = createMemo<Array<PublishingMenuItem[]>>(() => {
    const groups: Array<PublishingMenuItem[]> = [];
    const currentStatus = displayStatus();
    const canManage =
      hasPermission("publishing") &&
      publishingEnabled() &&
      currentStatus !== "error" &&
      currentStatus !== "loading" &&
      !content.offline() &&
      !content.syncing();

    if (version()) {
      groups.push([{ type: "header", label: "Assigned version" }, renderAssignedVersion]);
    }

    if (canManage && currentStatus !== "published") {
      groups.push([
        {
          label: "Publish current",
          icon: "i-material-symbols:publish-rounded",
          onClick: () => setAction("publish")
        }
      ]);
    }

    if (publishing.channelsError() || publishing.statusError() || publicationResponse()?.error) {
      groups.push([
        {
          label: "Retry publishing status",
          icon: "i-lucide:refresh-cw",
          onClick: publishing.retry
        }
      ]);
    }

    groups.push([
      {
        label: `Channel: ${publishing.getChannelName()}`,
        icon: "i-lucide:radio",
        items: [
          { type: "header", label: "Channel" },
          ...channelOptions().map((channel) => ({
            label: publishing.getChannelName(channel),
            selected: channel === selectedChannel(),
            onClick: () => {
              publishing.setChannel(channel);
            }
          }))
        ]
      }
    ]);

    if (!canManage) return groups;

    if (currentStatus === "published" || version()) {
      groups.push([
        {
          label: "Unpublish",
          icon: "i-material-symbols:unpublished-outline-rounded",
          onClick: () => setAction("unpublish")
        }
      ]);
    }

    return groups;
  });

  return (
    <Show when={displayStatus()}>
      {(currentStatus) => (
        <>
          <DropdownMenu
            title="Publishing"
            cardProps={{ class: "w-52" }}
            items={options()}
            opened={menuOpened()}
            setOpened={(opened) => {
              setMenuOpened(opened);

              if (opened && publishingEnabled()) {
                revalidateChannel();
              }
            }}
            mobileSheetDragFromContent={false}
            trigger={() => (
              <Show
                when={props.triggerVariant === "menu"}
                fallback={
                  <Button
                    class="flex w-full min-w-0 items-center justify-start"
                    size="small"
                    variant="outlined"
                    color="contrast"
                    aria-label="Publishing status"
                  >
                    <PublishingStatusIcon status={currentStatus()} />
                    <span class="min-w-0 flex-1 truncate px-1 text-start">
                      {STATUS_LABELS[currentStatus()]}
                    </span>
                    <div class="i-lucide:chevrons-up-down ml-auto shrink-0 text-gray-400" />
                  </Button>
                }
              >
                <button
                  type="button"
                  class="group relative flex min-h-7 w-full flex-1 select-none items-center gap-1 overflow-hidden rounded-lg pl-0.5 text-left font-medium outline-none @hover:bg-gradient-to-r @hover:from-gray-500/10 @hover:to-transparent"
                  aria-label="Open publishing menu"
                >
                  <PublishingStatusIcon status={currentStatus()} size="large" />
                  <span class="min-w-0 flex-1 truncate">Publishing</span>
                </button>
              </Show>
            )}
          />
          <ActionConfirmationDialog
            opened={Boolean(action())}
            title={action() === "publish" ? "Publish current document?" : "Unpublish content?"}
            description={
              action() === "publish"
                ? `Save and assign the current document to the ${publishing.getChannelName()} channel.`
                : `Remove this entry from the ${publishing.getChannelName()} channel. Its versions are kept.`
            }
            affected={[
              {
                id: props.entryID,
                icon: "i-lucide:file-text",
                label: entry()?.name || "Current entry"
              }
            ]}
            action={{
              color: action() === "publish" ? "primary" : "danger",
              icon:
                action() === "publish"
                  ? "i-material-symbols:publish-rounded"
                  : "i-material-symbols:unpublished-outline-rounded",
              label: action() === "publish" ? "Publish" : "Unpublish",
              loading: actionMutation.isPending,
              onClick: () => {
                const currentAction = action();

                if (currentAction) {
                  actionMutation.mutate({
                    action: currentAction,
                    channel: selectedChannel()
                  });
                }
              }
            }}
            onClose={() => {
              if (!actionMutation.isPending) setAction(null);
            }}
          />
        </>
      )}
    </Show>
  );
};

export { PublishingMenu };
