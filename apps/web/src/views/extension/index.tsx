import { mdiClose } from "@mdi/js";
import { Component } from "solid-js";
import { Card, IconButton, Heading } from "#components/primitives";
import { ExtensionDetails, useLocalStorage, useNotifications } from "#context";
import { ExtensionViewRenderer } from "#lib/extensions";

const ExtensionSidePanelView: Component<{ extension: ExtensionDetails }> = (props) => {
  const { setStorage } = useLocalStorage();
  const { notify } = useNotifications();

  return (
    <Card
      class="@container m-0 p-0 border-0 rounded-none flex flex-col h-full overflow-auto scrollbar-sm-contrast"
      color="contrast"
    >
      <ExtensionViewRenderer
        extension={props.extension}
        viewId={props.extension.sandbox?.spec.page?.sidePanelView}
        ctx={{
          contextFunctions: ["notify"],
          usableEnv: { readable: [], writable: [] },
          config: {}
        }}
        func={{ notify }}
        usableEnvData={{}}
      />
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
