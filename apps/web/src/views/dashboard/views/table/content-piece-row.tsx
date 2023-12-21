import { useDashboardListViewData } from "./list-view-context";
import { Component, For, Show } from "solid-js";
import clsx from "clsx";
import { Dynamic } from "solid-js/web";
import { mdiFileDocumentOutline } from "@mdi/js";
import { App, useLocalStorage } from "#context";

interface ContentPieceRowProps {
  contentPiece: App.ContentPieceWithAdditionalData;
}

const ContentPieceRow: Component<ContentPieceRowProps> = (props) => {
  const { columns } = useDashboardListViewData();
  const { setStorage } = useLocalStorage();

  return (
    <div
      class="flex justify-center items-center border-b-2 text-left font-500 border-gray-200 dark:border-gray-700 relative w-full hover:cursor-pointer hover:bg-gray-200 hover:bg-opacity-40 dark:hover:bg-gray-700 dark:hover:bg-opacity-40 group"
      onClick={() => {
        setStorage((storage) => ({
          ...storage,
          sidePanelView: "contentPiece",
          sidePanelWidth: storage.sidePanelWidth || 375,
          contentPieceId: props.contentPiece.id
        }));
      }}
      onDragStart={(event) => {
        const element = document.createElement("div");

        element.setAttribute(
          "class",
          "fixed left-[9999px] top-[9999px] flex justify-center items-center bg-gray-100 dark:bg-gray-800 h-9 px-2 py-1 rounded-lg"
        );
        element.insertAdjacentHTML(
          "afterbegin",
          `<svg viewBox="0 0 24 24" clip-rule="evenodd" fill-rule="evenodd" class="fill-current h-6 w-6"><path d="${mdiFileDocumentOutline}"/></svg><span class="pl-1">${props.contentPiece.title}</span>`
        );
        document.body.appendChild(element);

        const rect = element.getBoundingClientRect();

        event.dataTransfer?.setDragImage(element, rect.width / 2, rect.height / 2);
        setTimeout(() => {
          document.body.removeChild(element);
        });
        event.stopPropagation();
      }}
    >
      <For each={columns}>
        {(column) => {
          return (
            <div
              class={clsx(
                "border-r-2 border-gray-200 dark:border-gray-700 h-8",
                !column && "flex-1 min-w-[4rem]"
              )}
              style={{
                "min-width": column ? `${column.width}px` : undefined,
                "max-width": column ? `${column.width}px` : undefined
              }}
            >
              <Show when={column}>
                <Dynamic
                  component={column?.cell}
                  contentPiece={props.contentPiece}
                  column={column}
                />
              </Show>
            </div>
          );
        }}
      </For>
    </div>
  );
};

export { ContentPieceRow };
