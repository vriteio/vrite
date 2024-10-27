import {
  DashboardTableViewColumnConfig,
  DashboardTableViewColumnDef,
  useDashboardTableViewData
} from "./table-view-context";
import { mdiDotsVertical, mdiEyeOffOutline, mdiPlus } from "@mdi/js";
import { Component, For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import clsx from "clsx";
import { Checkbox, Dropdown, Icon, IconButton, Sortable } from "#components/primitives";

const DashboardTableViewHeader: Component = () => {
  const { columnDefs, columns, setColumns, container } = useDashboardTableViewData();
  const [resizedHeader, setResizedHeader] = createSignal("");
  const [dropdownOpened, setDropdownOpened] = createSignal("");
  const [addColumnDropdownOpened, setAddColumnDropdownOpened] = createSignal(false);
  const drag = (event: PointerEvent): void => {
    const headerId = resizedHeader();

    if (headerId) {
      const headerIndex = columns.findIndex((header) => header?.id === headerId);
      const header = columns[headerIndex];
      const columnDef = columnDefs[headerId];
      const ref = header?.ref;

      if (!ref) return;

      const { clientX } = event;
      const { left } = ref.getBoundingClientRect() || { left: 0 };
      const width = clientX - left;

      setColumns(headerIndex, "width", Math.max(width, columnDef.minWidth || 0));
      event.preventDefault();
    }
  };
  const release = (): void => {
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
    <Sortable
      ids={columns.map((column) => column.id)}
      class="flex bg-gray-50 dark:bg-gray-900 sticky top-0 z-1 border-b border-gray-200 dark:border-gray-700"
      filter=".locked"
      onDragChange={(ids) => {
        setColumns(ids.map((id) => columns.find((column) => column?.id === id)!));
      }}
      addon={() => (
        <div class="locked h-8 flex justify-center items-center text-left font-500 border-gray-200 dark:border-gray-700 relative bg-gray-200 bg-opacity-50 dark:bg-gray-700 dark:bg-opacity-30 flex-1 min-w-[4rem]">
          <div class="flex justify-start items-center w-full pl-0.5">
            <Dropdown
              placement="bottom-end"
              opened={addColumnDropdownOpened()}
              boundary={container()}
              class="m-0"
              fixed
              cardProps={{ class: "mt-2" }}
              setOpened={(opened) => {
                setAddColumnDropdownOpened(opened);
              }}
              activatorButton={() => (
                <IconButton
                  path={mdiPlus}
                  class="m-0 p-0.5"
                  variant="text"
                  text="soft"
                  onClick={(event) => {
                    event.stopPropagation();
                    setAddColumnDropdownOpened(true);
                  }}
                />
              )}
            >
              <div class="w-full flex flex-col gap-2">
                <For each={Object.values(columnDefs)}>
                  {(columnDef) => {
                    const columnConfig = (): DashboardTableViewColumnConfig | null => {
                      return columns.find((column) => column?.id === columnDef.id) || null;
                    };

                    return (
                      <div class="flex gap-2 justify-center items-center">
                        <Checkbox
                          class="!bg-gray-100 dark:!bg-gray-800"
                          checked={Boolean(columnConfig())}
                          setChecked={(value) => {
                            setColumns((columns) => {
                              if (value) {
                                return [
                                  ...columns,
                                  {
                                    id: columnDef.id,
                                    width: columnDef.minWidth
                                  }
                                ];
                              }

                              return columns.filter((column) => column?.id !== columnDef.id);
                            });
                          }}
                        />
                        <div class="flex gap-1 justify-center items-center flex-1">
                          <Icon path={columnDef.icon} class="h-5 w-5" />
                          <span class="font-semibold flex-1">{columnDef.label}</span>
                        </div>
                      </div>
                    );
                  }}
                </For>
              </div>
            </Dropdown>
          </div>
        </div>
      )}
    >
      {(_columnId, index, dataProps) => {
        const column = (): DashboardTableViewColumnConfig => columns[index()];
        const columnDef = (): DashboardTableViewColumnDef => columnDefs[column()?.id];

        return (
          <Show when={column() && columnDef()}>
            <div
              class="h-8 flex justify-center items-center border-r first:border-l-0 text-left font-500 border-gray-200 dark:border-gray-700 relative bg-gray-200 bg-opacity-50 dark:bg-gray-700 dark:bg-opacity-30"
              ref={(element) => {
                setColumns(index(), "ref", element);
              }}
              style={{
                "min-width": `${column()?.width || 0}px`,
                "max-width": `${column()?.width || 0}px`
              }}
              {...dataProps()}
            >
              <span class="text-gray-500 dark:text-gray-400 font-semibold flex-1 px-2">
                {columnDef().label}
              </span>
              <Dropdown
                placement="bottom-end"
                alternativePlacements={["bottom-start", "bottom-end"]}
                boundary={container()}
                cardProps={{ class: "mt-2" }}
                opened={dropdownOpened() === column()?.id}
                fixed
                class="m-0 mr-0.5"
                setOpened={(opened) => {
                  setDropdownOpened(opened ? column().id : "");
                }}
                activatorButton={() => (
                  <IconButton
                    path={mdiDotsVertical}
                    class="m-0 p-0.5"
                    variant="text"
                    text="soft"
                    onClick={(event) => {
                      event.stopPropagation();
                      setDropdownOpened(column().id);
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
                    class="justify-start whitespace-nowrap w-full m-0"
                    onClick={() => {
                      setColumns((columns) => {
                        return columns.filter((column) => column?.id !== columnDef().id);
                      });
                    }}
                  />
                </div>
              </Dropdown>
              <div
                class="flex justify-center items-center absolute h-full -right-11px w-5 hover:cursor-col-resize group z-1"
                onPointerDown={(event) => {
                  setResizedHeader(column().id);
                  event.preventDefault();
                }}
              >
                <div
                  class={clsx(
                    "group-hover:bg-gradient-to-tr h-full w-3px rounded-full",
                    resizedHeader() === column().id && "bg-gradient-to-tr"
                  )}
                />
              </div>
            </div>
          </Show>
        );
      }}
    </Sortable>
  );
};

export { DashboardTableViewHeader };
