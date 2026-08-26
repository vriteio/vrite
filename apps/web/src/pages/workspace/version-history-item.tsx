import {
  type Card,
  DropdownArea,
  DropdownMenu,
  IconButton,
  type MenuItem,
  Tooltip,
  useDropdown
} from "@andesine/components";
import { format, formatDistanceToNow } from "date-fns";
import { type Component, type ComponentProps, createSignal, For, Show } from "solid-js";
import { TreeItem, useTree } from "#web/components/tree";
import { usePublishing } from "#web/context/publishing";
import { type VersionReason, type VersionSummary } from "#web/lib/data";
import { MAX_VERSION_NAME_LENGTH } from "./version-dialogs";
import clsx from "clsx";

interface VersionHistoryItemProps {
  active: boolean;
  assignedChannels: string[];
  canManage: boolean;
  canManagePublishing: boolean;
  onAssign(channel: string): void;
  onCompare(): void;
  onOpen(): void;
  onRename(name: string): void;
  onRevert(): void;
  onUnpublish(channel: string): void;
  version: VersionSummary;
}

const versionReasonLabels: Record<VersionReason, string> = {
  auto: "Automatic",
  manual: "Manual",
  revert: "Revert"
};

const VersionHistoryItem: Component<VersionHistoryItemProps> = (props) => {
  const [, { setRenaming }] = useTree();
  const publishing = usePublishing();
  const { closeMobileDropdowns } = useDropdown();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const label = () => props.version.name || props.version.entryName;
  const createdAt = () => new Date(props.version.createdAt);
  const publishedToCurrentChannel = () => {
    return props.assignedChannels.includes(publishing.channel());
  };
  const relativeTime = () => {
    return formatDistanceToNow(createdAt(), {
      addSuffix: true
    });
  };
  const startRenaming = () => {
    setMenuOpened(false);
    queueMicrotask(() => setRenaming(props.version.id));
  };
  const navigate = (callback: () => void) => {
    callback();
    closeMobileDropdowns();
  };
  const options = (): Array<MenuItem[]> => {
    const groups: Array<MenuItem[]> = [
      [
        {
          label: "Compare with current",
          icon: "i-lucide:git-compare-arrows",
          onClick: () => navigate(props.onCompare)
        },
        {
          label: "Rename version",
          icon: "i-lucide:pencil",
          disabled: !props.canManage,
          onClick: startRenaming
        },
        {
          label: "Revert to version",
          icon: "i-lucide:history",
          disabled: !props.canManage,
          onClick: props.onRevert
        }
      ]
    ];

    if (props.canManagePublishing) {
      const channel = publishing.channel();
      const published = props.assignedChannels.includes(channel);
      const publishingOptions: MenuItem[] = [];

      if (published) {
        publishingOptions.push({
          label: "Unpublish",
          icon: "i-material-symbols:unpublished-outline-rounded",
          onClick: () => props.onUnpublish(channel)
        });
      } else {
        publishingOptions.push({
          label: "Publish",
          icon: "i-material-symbols:publish-rounded",
          onClick: () => props.onAssign(channel)
        });
      }

      groups.push(publishingOptions);
    }

    return groups;
  };

  return (
    <DropdownArea>
      <TreeItem
        id={props.version.id}
        label={label()}
        labelMaxLength={MAX_VERSION_NAME_LENGTH}
        topLevel
        selectable
        highlighted={props.active}
        icon={
          <div class="h-6 w-6 flex justify-center items-center">
            <div
              class={clsx(
                "h-5 w-5",
                props.version.reason === "auto" && "i-lucide:circle-dot-dashed",
                props.version.reason === "manual" && "i-lucide:circle-dot",
                props.version.reason === "revert" && "i-lucide:refresh-ccw-dot",
                props.active
                  ? "bg-gradient-to-tr"
                  : publishedToCurrentChannel()
                    ? "text-green-500"
                    : "text-gray-400"
              )}
            />
          </div>
        }
        iconClass="self-start mt-0.5"
        onClick={() => navigate(props.onOpen)}
        onRename={props.onRename}
        renderLabel={(currentLabel) => (
          <div class="flex min-w-0 flex-1 flex-col leading-tight">
            <div class="flex min-w-0 flex-1">{currentLabel}</div>
            <div class="flex w-full min-w-0 items-center gap-1 text-left text-xs font-normal text-gray-400">
              <Tooltip
                content={
                  <div class="flex flex-col items-start justify-center gap-px">
                    <span class="opacity-50 font-mono text-[80%] mb-0.5">
                      {versionReasonLabels[props.version.reason]}
                    </span>
                    <span>{format(createdAt(), "MMM d, yyyy HH:mm:ss")}</span>
                  </div>
                }
                enabled={!menuOpened()}
                offset={{ mainAxis: 8 }}
                placement="bottom-start"
                wrapperClass="min-w-0 !items-start !justify-start"
                fixed
              >
                <span class="truncate">{relativeTime()}</span>
              </Tooltip>
              <Show when={props.assignedChannels.length > 0}>
                <span class="h-3 w-px shrink-0 bg-gray-400 opacity-20" />
                <Tooltip
                  content={
                    <div class="flex flex-col items-start gap-px">
                      <span class="font-mono text-[80%] opacity-50 mb-0.5">Published to</span>
                      <For each={props.assignedChannels}>
                        {(channel) => (
                          <span class="text-xs">{publishing.getChannelName(channel)}</span>
                        )}
                      </For>
                    </div>
                  }
                  enabled={!menuOpened()}
                  offset={{ mainAxis: 8 }}
                  placement="bottom-start"
                  fixed
                >
                  <span class="flex shrink-0 items-center gap-0.5">
                    <span>{props.assignedChannels.length}</span>
                    <span class="i-lucide:radio h-3 w-3" />
                  </span>
                </Tooltip>
              </Show>
            </div>
          </div>
        )}
        actions={
          <>
            <DropdownMenu
              class="self-start"
              title={label()}
              cardProps={
                {
                  "class": "w-48",
                  "data-tree-interaction": ""
                } as Partial<ComponentProps<typeof Card>>
              }
              items={options()}
              opened={menuOpened()}
              mobileSheetDragFromContent={false}
              portal={false}
              setOpened={setMenuOpened}
              onClick={(event) => event.stopPropagation()}
              trigger={() => (
                <div
                  class={
                    !menuOpened()
                      ? "shrink-0 opacity-20 media-mouse:hidden media-mouse:group-hover:flex media-mouse:group-hover:opacity-100"
                      : "shrink-0"
                  }
                >
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                  />
                </div>
              )}
            />
          </>
        }
      />
    </DropdownArea>
  );
};

export { VersionHistoryItem };
