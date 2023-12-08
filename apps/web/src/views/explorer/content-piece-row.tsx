import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { mdiCheck, mdiDotsVertical, mdiFileDocumentOutline, mdiRename, mdiTrashCan } from "@mdi/js";
import { useLocation, useNavigate } from "@solidjs/router";
import SortableLib from "sortablejs";
import clsx from "clsx";
import { Card, Dropdown, Icon, IconButton, Input } from "#components/primitives";
import {
  App,
  hasPermission,
  useClient,
  useConfirmationModal,
  useLocalStorage,
  useNotifications,
  useSharedState
} from "#context";
import { createRef } from "#lib/utils";

interface ContentPieceRowProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"order">;
  active?: boolean;
  onDragEnd?(event: SortableLib.SortableEvent): void;
  onClick?(): void;
}

const ContentPieceRow: Component<ContentPieceRowProps> = (props) => {
  const createSharedSignal = useSharedState();
  const { confirmDelete } = useConfirmationModal();
  const { notify } = useNotifications();
  const client = useClient();
  const location = useLocation();
  const [sortableInstanceRef, setSortableInstanceRef] = createRef<SortableLib | null>(null);
  const [renaming, setRenaming] = createSignal(false);
  const [activeDraggablePiece, setActiveDraggablePiece] = createSharedSignal(
    "activeDraggablePiece",
    null
  );
  const [activeDraggableGroup] = createSharedSignal("activeDraggableGroup", null);
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const menuOptions = createMemo(() => {
    const menuOptions: Array<{
      icon: string;
      label: string;
      class?: string;
      color?: "danger" | "success";
      onClick(): void;
    } | null> = [];

    if (hasPermission("manageDashboard")) {
      menuOptions.push(
        {
          icon: mdiRename,
          label: "Rename group",
          class: "justify-start",
          onClick() {
            setDropdownOpened(false);
            setRenaming(true);
          }
        },
        null,
        {
          icon: mdiTrashCan,
          label: "Delete",
          class: "justify-start",
          color: "danger",
          onClick() {
            setDropdownOpened(false);
            confirmDelete({
              header: "Delete group",
              content: (
                <p>
                  Do you really want to delete this content piece? This will delete all its content
                  and metadata.
                </p>
              ),
              async onConfirm() {
                if (!props.contentPiece) return;

                try {
                  await client.contentGroups.delete.mutate({ id: props.contentPiece.id });
                  notify({ text: "Content piece deleted", type: "success" });
                } catch (error) {
                  notify({ text: "Couldn't delete the content piece", type: "success" });
                }
              }
            });
          }
        }
      );
    }

    return menuOptions;
  });

  createEffect(() => {
    const sortableInstance = sortableInstanceRef();

    if (!sortableInstance) return;

    sortableInstance.option("disabled", renaming() || !hasPermission("manageDashboard"));
  });

  return (
    <div
      class={clsx(
        "flex flex-1 justify-center items-center cursor-pointer overflow-hidden ml-0.5 py-1 group",
        !dropdownOpened() &&
          (location.pathname !== "/editor" || !props.active) &&
          "@hover-bg-gray-200 dark:@hover-bg-gray-700"
      )}
      ref={(el) => {
        const sortableInstance = SortableLib.create(el, {
          group: {
            name: "shared",
            pull: false,
            put: false
          },
          delayOnTouchOnly: true,
          delay: 250,
          disabled: !hasPermission("manageDashboard"),
          revertOnSpill: true,
          sort: false,
          onStart() {
            setActiveDraggablePiece(props.contentPiece);
          },
          onEnd(event) {
            event.preventDefault();
            props.onDragEnd?.(event);
            setActiveDraggablePiece(null);
          }
        });

        setSortableInstanceRef(sortableInstance);
      }}
    >
      <button
        class="flex-1 flex justify-start items-center"
        data-content-piece-id={props.contentPiece.id}
        onClick={() => {
          props.onClick?.();
        }}
      >
        <Icon
          class={clsx(
            "h-6 min-w-6 ml-6.5 mr-1 text-gray-500 dark:text-gray-400",
            props.active &&
              !activeDraggableGroup() &&
              !activeDraggablePiece() &&
              location.pathname === "/editor" &&
              "fill-[url(#gradient)]"
          )}
          path={mdiFileDocumentOutline}
        />
        <Show
          when={!renaming()}
          fallback={
            <Input
              wrapperClass="flex-1"
              class="m-0 p-0 !bg-transparent h-6 rounded-none pointer-events-auto"
              value={props.contentPiece.title}
              ref={(el) => {
                setTimeout(() => {
                  el?.select();
                }, 0);
              }}
              onChange={(event) => {
                const title = event.currentTarget.value || "";

                client.contentPieces.update.mutate({
                  id: props.contentPiece.id,
                  title
                });
                setRenaming(false);
              }}
            />
          }
        >
          <span
            class={clsx(
              "clamp-1 text-start",
              props.active &&
                !activeDraggableGroup() &&
                !activeDraggablePiece() &&
                location.pathname === "/editor" &&
                "text-transparent bg-clip-text bg-gradient-to-tr"
            )}
          >
            {props.contentPiece.title}
          </span>
        </Show>
      </button>
      <Show
        when={!renaming()}
        fallback={
          <IconButton
            path={mdiCheck}
            class="m-0 p-0.25 mr-4 ml-1"
            variant="text"
            color="contrast"
            text="soft"
            onClick={() => {
              setRenaming(false);
            }}
          />
        }
      >
        <Dropdown
          placement="bottom-end"
          class="ml-1 mr-4"
          opened={dropdownOpened()}
          setOpened={setDropdownOpened}
          fixed
          activatorButton={() => (
            <IconButton
              path={mdiDotsVertical}
              class={clsx("m-0 p-0.25 group-hover:opacity-100", !dropdownOpened() && "opacity-0")}
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
      </Show>
    </div>
  );
};

export { ContentPieceRow };
