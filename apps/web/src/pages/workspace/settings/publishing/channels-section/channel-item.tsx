import { type Card, DropdownArea, DropdownMenu, IconButton, Tooltip } from "@andesine/components";
import clsx from "clsx";
import {
  type Component,
  type ComponentProps,
  createEffect,
  createMemo,
  createSignal,
  Match,
  Switch
} from "solid-js";
import { TreeItem, useTree } from "#web/components/tree";
import { type PublishingChannel } from "#web/lib/data";
import { useClipboard } from "#web/context/clipboard";

interface ChannelItemProps {
  assignmentCount: number;
  canManage: boolean;
  channel: PublishingChannel;
  loading?: boolean;
  onDelete(ids: string[]): void;
}

const ChannelItem: Component<ChannelItemProps> = (props) => {
  const [{ selection }, { setSelection }] = useTree();
  const { copyText } = useClipboard();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const editable = () => props.canManage && !props.channel.builtIn && !props.loading;
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(isMulti
        ? []
        : [
            {
              label: "Copy channel code",
              icon: "i-lucide:copy",
              onClick: () => {
                void copyText(props.channel.code, {
                  success: "API code copied to clipboard",
                  fallback: { title: "Copy API code manually" }
                });
              }
            }
          ]),
      {
        label: isMulti ? `Delete ${selectedIDs.length} channels` : "Delete",
        icon: "i-lucide:trash",
        color: "danger" as const,
        onClick: () => {
          props.onDelete(isMulti ? selectedIDs : [props.channel.code]);
          setSelection([]);
        }
      }
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) =>
        selectedIDs.includes(props.channel.code) ? selectedIDs : [props.channel.code]
      );
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.channel.code}
        label={props.channel.name}
        topLevel
        checkbox={editable()}
        selectable={editable()}
        class={clsx("min-h-8 px-1 py-0.5", props.loading && "animate-pulse")}
        icon={<div class="i-lucide:radio h-5 w-5 text-gray-400" />}
        renderLabel={(label) => (
          <div class="flex min-w-0 flex-1 items-center gap-1.5">
            <div class="flex min-w-0 flex-1 items-center gap-1.5" title={props.channel.name}>
              <div class="min-w-0 truncate">{label}</div>
              <div class="hidden h-4 w-px shrink-0 rounded-full bg-gray-200 md:block" />
              <span class="hidden shrink-0 font-mono text-xs text-gray-400 md:inline">
                {props.channel.code}
              </span>
              <div class="flex-1" />
            </div>
            <span class="shrink-0 text-xs text-gray-400">
              {props.assignmentCount}{" "}
              {props.assignmentCount === 1 ? "entry assignment" : "entry assignments"}
            </span>
          </div>
        )}
        actions={
          <Switch>
            <Match when={props.canManage && !props.channel.builtIn}>
              <div onClick={(event: MouseEvent) => event.stopPropagation()}>
                <DropdownMenu
                  title={props.channel.name}
                  cardProps={
                    {
                      "class": "w-52",
                      "data-tree-interaction": ""
                    } as Partial<ComponentProps<typeof Card>>
                  }
                  opened={menuOpened()}
                  portal={false}
                  setOpened={setMenuOpened}
                  trigger={() => (
                    <div
                      class={clsx(
                        !menuOpened() &&
                          !props.loading &&
                          "opacity-20 media-mouse:group-hover:opacity-100"
                      )}
                    >
                      <IconButton
                        icon="i-lucide:ellipsis-vertical"
                        size="small"
                        variant="text"
                        text="soft"
                        loading={props.loading}
                      />
                    </div>
                  )}
                  items={dropdownOptions()}
                />
              </div>
            </Match>
            <Match when={props.channel.builtIn}>
              <Tooltip content="The default channel cannot be deleted" placement="left">
                <div class="opacity-20 media-mouse:group-hover:opacity-100">
                  <IconButton
                    icon="i-lucide:lock"
                    iconProps={{ class: "h-4 w-4" }}
                    class="h-7 w-7"
                    size="small"
                    variant="text"
                    text="soft"
                  />
                </div>
              </Tooltip>
            </Match>
          </Switch>
        }
      />
    </DropdownArea>
  );
};

export { ChannelItem };
