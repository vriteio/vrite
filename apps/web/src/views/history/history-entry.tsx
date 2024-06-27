import { useHistoryMenuData } from "./history-context";
import {
  Component,
  For,
  Match,
  Show,
  Switch,
  createEffect,
  createMemo,
  createSignal
} from "solid-js";
import {
  mdiAccountCircle,
  mdiCheck,
  mdiChevronRight,
  mdiCircleOutline,
  mdiDotsVertical,
  mdiRename,
  mdiSetLeft,
  mdiSetRight
} from "@mdi/js";
import clsx from "clsx";
import dayjs from "dayjs";
import { useNavigate } from "@solidjs/router";
import { Dropdown, Icon, IconButton, Input, Tooltip } from "#components/primitives";
import { App, useClient, useHistoryData } from "#context";

interface HistoryEntryProps {
  entry: App.VersionWithAdditionalData;
  subEntries?: App.VersionWithAdditionalData[];
  onClick?(entry: App.VersionWithAdditionalData): void;
}

const HistoryEntry: Component<HistoryEntryProps> = (props) => {
  const navigate = useNavigate();
  const { labelling, setLabelling, useExpanded } = useHistoryMenuData();
  const { historyActions, activeVersionId } = useHistoryData();
  const [expanded, setExpanded] = useExpanded(props.entry.id);
  const client = useClient();
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    } | null> = [];

    menuOptions.push(
      {
        icon: mdiRename,
        label: "Assign label",
        class: "justify-start",
        onClick() {
          setDropdownOpened(false);
          setLabelling(props.entry.id);
        }
      },
      null,
      {
        icon: mdiSetRight,
        label: "Compare with latest",
        class: "justify-start",
        onClick() {
          setDropdownOpened(false);
          navigate(`/diff/latest/${props.entry.contentPieceId}/${props.entry.id}`);
        }
      },
      {
        icon: mdiSetLeft,
        label: "Compare with previous",
        class: "justify-start",
        onClick() {
          setDropdownOpened(false);
          navigate(`/diff/previous/${props.entry.contentPieceId}/${props.entry.id}`);
        }
      }
    );

    return menuOptions;
  });
  const active = (): boolean => {
    return activeVersionId() === props.entry.id;
  };

  createEffect(() => {
    if (props.subEntries?.some((entry) => entry.id === activeVersionId())) {
      setExpanded(true);
    }
  });

  return (
    <div>
      <div
        class={clsx(
          "flex justify-center items-center cursor-pointer overflow-hidden ml-2 pl-1 group rounded-l-md",
          !dropdownOpened() && !active() && "@hover-bg-gray-200 dark:@hover-bg-gray-700",
          !props.subEntries && "!ml-0.5 !rounded-l-0"
        )}
      >
        <div class="h-5 min-w-5 flex justify-center items-center mr-1">
          <button
            onClick={() => {
              if (props.subEntries?.length) {
                setExpanded(!expanded());
              } else {
                if (labelling()) return;

                props.onClick?.(props.entry);
              }
            }}
          >
            <Icon
              class={clsx(
                "transform transition text-gray-500 dark:text-gray-400",
                props.subEntries?.length ? "h-5 min-w-5" : "h-4 min-w-4",
                active() && "fill-[url(#gradient)]",
                expanded() && "transform rotate-90"
              )}
              path={props.subEntries?.length ? mdiChevronRight : mdiCircleOutline}
            />
          </button>
        </div>
        <button
          class="flex-1 flex justify-start items-center h-7"
          data-version-id={props.entry.id}
          onClick={() => {
            if (labelling()) return;

            props.onClick?.(props.entry);
          }}
        >
          <Show
            when={labelling() !== props.entry.id}
            fallback={
              <Input
                wrapperClass="flex-1"
                class="m-0 p-0 !bg-transparent h-6 rounded-none pointer-events-auto"
                value={props.entry.label || dayjs(props.entry.date).format("MMMM DD, HH:mm")}
                ref={(el) => {
                  setTimeout(() => {
                    el?.select();
                  }, 0);
                }}
                onEnter={(event) => {
                  const target = event.currentTarget as HTMLInputElement;
                  const label = target.value || "";

                  client.versions.update.mutate({
                    id: props.entry.id,
                    ...(label && { label })
                  });
                  historyActions.updateVersion({ ...props.entry, label });
                  setLabelling("");
                }}
                onChange={(event) => {
                  const label = event.currentTarget.value || "";

                  client.versions.update.mutate({
                    id: props.entry.id,
                    ...(label && { label })
                  });
                  historyActions.updateVersion({ ...props.entry, label });
                  setLabelling("");
                }}
              />
            }
          >
            <span
              title={props.entry.date}
              class={clsx(
                "text-start clamp-1",
                active() && "text-transparent bg-gradient-to-tr bg-clip-text"
              )}
            >
              {props.entry.label || dayjs(props.entry.date).format("MMMM DD, HH:mm")}
            </span>
            <div class="flex-1" />
            <div class="flex flex-row-reverse">
              <For each={props.entry.members.slice(0, 4)}>
                {(member, index) => {
                  return (
                    <div
                      style={{
                        "margin-right": `-${index() > 0 ? 0.6 : 0}rem`,
                        "opacity": `${1 - index() * 0.1}`,
                        "z-index": index()
                      }}
                      class="!hover:z-10"
                    >
                      <Tooltip
                        text={member.profile.fullName || member.profile.username}
                        class="mt-1"
                        fixed
                      >
                        <Show
                          when={member.profile.avatar}
                          fallback={
                            <Icon
                              path={mdiAccountCircle}
                              class="h-6 min-w-6 text-gray-500 dark:text-gray-400"
                            />
                          }
                        >
                          <img src={member.profile.avatar} class="h-6 min-w-6 rounded-full" />
                        </Show>
                      </Tooltip>
                    </div>
                  );
                }}
              </For>
            </div>
          </Show>
        </button>
        <Switch>
          <Match when={labelling() === props.entry.id}>
            <IconButton
              path={mdiCheck}
              class="m-0 p-0 mr-4 ml-1"
              variant="text"
              color="contrast"
              text="soft"
              onClick={() => {
                setLabelling("");
              }}
            />
          </Match>
          <Match when={true}>
            <Dropdown
              placement="bottom-end"
              class="ml-1 mr-4"
              opened={dropdownOpened()}
              setOpened={setDropdownOpened}
              fixed
              alternativePlacements={["top-end", "bottom-end"]}
              activatorButton={() => (
                <IconButton
                  path={mdiDotsVertical}
                  class={clsx("m-0 p-0 group-hover:opacity-100", !dropdownOpened() && "opacity-0")}
                  variant="text"
                  color="contrast"
                  text="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    setDropdownOpened(true);
                  }}
                />
              )}
            >
              <div class="w-full flex flex-col">
                <For each={menuOptions()}>
                  {(item) => {
                    if (!item) {
                      return (
                        <div class="hidden md:block w-full h-2px my-1 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      );
                    }

                    return (
                      <IconButton
                        path={item.icon}
                        label={item.label}
                        variant="text"
                        text="soft"
                        color={item.color}
                        class={clsx("justify-start whitespace-nowrap w-full m-0", item.class)}
                        onClick={item.onClick}
                      />
                    );
                  }}
                </For>
              </div>
            </Dropdown>
          </Match>
        </Switch>
      </div>
      <Show when={expanded() && props.subEntries?.length}>
        <div class="flex relative ml-5.25">
          <div class="h-full w-0.5 absolute left-0 rounded-full bg-black bg-opacity-5 dark:bg-white dark:bg-opacity-10"></div>
          <div class="flex flex-1 flex-col">
            <For each={props.subEntries}>
              {(entry) => {
                return <HistoryEntry entry={entry} onClick={props.onClick} />;
              }}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
};

export { HistoryEntry };
