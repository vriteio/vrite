import { mdiClose } from "@mdi/js";
import { Component } from "solid-js";
import { Card, IconButton, Heading } from "#components/primitives";
import { ExtensionDetails, useLocalStorage } from "#context";

const ExtensionSidePanelView: Component<{ extension: ExtensionDetails }> = (props) => {
  const { setStorage } = useLocalStorage();

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <div class="flex justify-start items-start mb-4 px-5 flex-col pt-5">
        <div class="flex justify-center items-center">
          <IconButton
            path={mdiClose}
            text="soft"
            badge
            class="flex md:hidden mr-2 m-0"
            onClick={() => {
              setStorage((storage) => ({
                ...storage,
                sidePanelWidth: 0
              }));
            }}
          />
          <Heading level={1} class="py-1">
            {props.extension.spec.displayName}
          </Heading>
        </div>
      </div>
      <div class="flex-col h-full relative flex overflow-hidden">
        <div class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5">
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5 pb-5">
            {/* contnet */}
          </div>
        </div>
      </div>
    </Card>
  );
};
const ExtensionMainView: Component = () => {
  return (
    <>
      <iframe src="https://random.vrite.app/" class="h-full w-full" />
    </>
  );
};

export { ExtensionMainView, ExtensionSidePanelView };
