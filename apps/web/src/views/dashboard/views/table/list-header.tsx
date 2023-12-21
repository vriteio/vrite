import { useDashboardListViewData } from "./list-view-context";
import { mdiDotsVertical, mdiEyeOffOutline, mdiPlus } from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { Dropdown, IconButton, Tooltip } from "#components/primitives";

const DashboardListViewHeader: Component = () => {
  const { columns, setColumns } = useDashboardListViewData();
  const [resizedHeader, setResizedHeader] = createSignal("");
  const [dropdownOpened, setDropdownOpened] = createSignal("");
  const drag = (event: PointerEvent): void => {
    const headerId = resizedHeader();

    if (headerId) {
      const headerIndex = columns.findIndex((header) => header?.id === headerId);
      const header = columns[headerIndex];
      const ref = header?.headerRef;

      if (!ref) return;

      const { clientX } = event;
      const { left } = ref.getBoundingClientRect() || { left: 0 };
      const width = clientX - left;

      setColumns(headerIndex, "width", Math.max(width, header?.minWidth || 0));
      event.preventDefault();
    }
  };
  const release = (event: PointerEvent): void => {
    setResizedHeader("");
  };

  onMount(() => {
    document.body.addEventListener("pointermove", drag);
    document.body.addEventListener("pointerup", release);
    document.body.addEventListener("pointerleave", release);
  });
  onCleanup(() => {
    document.body.removeEventListener("pointermove", drag);
    document.body.removeEventListener("pointerup", release);
    document.body.removeEventListener("pointerleave", release);
  });

  return (
    <div class="flex bg-gray-50 dark:bg-gray-900 sticky top-0 z-1 border-b-2 border-gray-200 dark:border-gray-700">
      <For each={columns}>
        {(column, index) => {
          return (
            <div
              class={clsx(
                "h-8 flex justify-center items-center border-r-2 first:border-l-0 text-left font-500 border-gray-200 dark:border-gray-700 relative bg-gray-200 border-gray-200 bg-opacity-50 dark:bg-gray-700 dark:bg-opacity-30 dark:border-gray-700",
                !column && "flex-1 min-w-[4rem]"
              )}
              ref={(element) => {
                if (column) setColumns(index(), "headerRef", element);
              }}
              style={{
                "min-width": column ? `${column.width}px` : undefined,
                "max-width": column ? `${column.width}px` : undefined
              }}
            >
              <Show
                when={column}
                fallback={
                  <div class="flex justify-start items-center w-full pl-0.5">
                    <Dropdown
                      placement="bottom-start"
                      opened={dropdownOpened() === "add-column"}
                      fixed
                      class="m-0"
                      setOpened={(opened) => {
                        setDropdownOpened(opened ? "add-column" : "");
                      }}
                      activatorButton={() => (
                        <IconButton
                          path={mdiPlus}
                          class="m-0 p-0.5"
                          variant="text"
                          text="soft"
                          onClick={(event) => {
                            event.stopPropagation();
                            setDropdownOpened("add-column");
                          }}
                        />
                      )}
                    >
                      <div class="w-full flex flex-col">
                        <IconButton
                          path={mdiEyeOffOutline}
                          label="Hide column"
                          variant="text"
                          text="soft"
                          class="justify-start whitespace-nowrap w-full m-0 justify-start"
                        />
                      </div>
                    </Dropdown>
                  </div>
                }
              >
                <span class="text-gray-500 dark:text-gray-400 font-semibold flex-1 px-2">
                  {column?.header}
                </span>
                <Dropdown
                  placement="bottom-end"
                  opened={dropdownOpened() === column?.id}
                  fixed
                  class="m-0 mr-0.5"
                  setOpened={(opened) => {
                    setDropdownOpened(opened ? column?.id || "" : "");
                  }}
                  activatorButton={() => (
                    <IconButton
                      path={mdiDotsVertical}
                      class="m-0 p-0.5"
                      variant="text"
                      text="soft"
                      onClick={(event) => {
                        event.stopPropagation();
                        setDropdownOpened(column?.id || "");
                      }}
                    />
                  )}
                >
                  <div class="w-full flex flex-col">
                    <IconButton
                      path={mdiEyeOffOutline}
                      label="Hide column"
                      variant="text"
                      text="soft"
                      class="justify-start whitespace-nowrap w-full m-0 justify-start"
                    />
                  </div>
                </Dropdown>
                <div
                  class="flex justify-center items-center absolute h-full -right-11px w-5 hover:cursor-col-resize group z-1"
                  onPointerDown={(event) => {
                    setResizedHeader(column?.id || "");
                    event.preventDefault();
                  }}
                >
                  <div
                    class={clsx(
                      "group-hover:bg-gradient-to-tr h-full w-3px rounded-full",
                      resizedHeader() === column?.id && "bg-gradient-to-tr"
                    )}
                  />
                </div>
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export { DashboardListViewHeader };
