import { useDashboardTableViewData } from "./table-view-context";
import { Component, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import { App, useLocalStorage } from "#context";

interface ContentPieceRowProps {
  contentPiece: App.ContentPieceWithAdditionalData;
  dataProps: Record<string, string>;
  index: number;
}

const ContentPieceRow: Component<ContentPieceRowProps> = (props) => {
  const { columnDefs, columns } = useDashboardTableViewData();
  const { setStorage } = useLocalStorage();

  return (
    <div
      class="flex justify-center items-center border-b-2 text-left font-500 border-gray-200 dark:border-gray-700 relative w-full hover:cursor-pointer hover:bg-gray-200 hover:bg-opacity-40 dark:hover:bg-gray-700 dark:hover:bg-opacity-40"
      onClick={() => {
        setStorage((storage) => ({
          ...storage,
          sidePanelView: "contentPiece",
          sidePanelWidth: storage.sidePanelWidth || 375,
          activeContentPieceId: props.contentPiece.id
        }));
      }}
      data-content-piece-id={props.contentPiece.id}
      data-index={props.index}
      {...props.dataProps}
    >
      <For each={columns}>
        {(column) => {
          return (
            <div
              class="border-r-2 border-gray-200 dark:border-gray-700 h-8"
              style={{
                "min-width": `${column.width}px`,
                "max-width": `${column.width}px`
              }}
            >
              <Dynamic
                component={columnDefs[column.id].cell}
                columnDef={columnDefs[column.id]}
                contentPiece={props.contentPiece}
                column={column}
              />
            </div>
          );
        }}
      </For>
      <div class="border-r-2 border-gray-200 dark:border-gray-700 h-8 flex-1 min-w-[4rem]" />
    </div>
  );
};

export { ContentPieceRow };
