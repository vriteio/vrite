import { TreeLevel } from "./tree-level";
import { ExplorerDataProvider } from "./explorer-context";
import { Component } from "solid-js";
import { mdiClose, mdiHexagonSlice6 } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Heading, IconButton } from "#components/primitives";
import { useAuthenticatedUserData, useContentData, useLocalStorage } from "#context";
import { ScrollShadow } from "#components/fragments";

const ExplorerTree: Component = () => {
  const { activeContentGroupId } = useContentData();
  const { setStorage } = useLocalStorage();
  const { workspace } = useAuthenticatedUserData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);

  return (
    <div class="relative overflow-hidden w-full pl-3 flex flex-col">
      <div class={"flex justify-start items-start mb-2 px-2 pr-5 flex-col pt-5"}>
        <div class="flex justify-center items-center w-full">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                rightPanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1 flex-1">
            Explorer
          </Heading>
        </div>
        <IconButton
          class="m-0 py-0 !font-normal"
          path={mdiHexagonSlice6}
          variant="text"
          text="soft"
          color={activeContentGroupId() ? "base" : "primary"}
          size="small"
          onClick={() => {
            setStorage((storage) => ({
              ...storage,
              activeContentGroupId: undefined
            }));
          }}
          label={<span class="flex-1 clamp-1 ml-1">{workspace()?.name}</span>}
        />
      </div>
      <div class="relative overflow-hidden flex-1">
        <div
          class="flex flex-col w-full h-full overflow-y-auto scrollbar-sm-contrast pb-5"
          ref={setScrollableContainerRef}
        >
          <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />
          <div>
            <TreeLevel />
          </div>
        </div>
      </div>
    </div>
  );
};
const ExplorerView: Component = () => {
  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <ExplorerDataProvider>
        <ExplorerTree />
      </ExplorerDataProvider>
    </div>
  );
};

export { ExplorerView };
