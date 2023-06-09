import { ComponentRenderer } from "./component-renderer";
import { useViewContext } from "./view-context";
import { ExtensionSpec, ExtensionView } from "@vrite/extensions";
import { Loader } from "#components/primitives";
import { Component, For, Show, createSignal } from "solid-js";
import { useExtensionsContext } from "#context";

interface ViewRendererProps {
  spec: ExtensionSpec;
  view: "configurationView" | "contentPieceView" | `blockActionView:${string}`;
}

const ViewRenderer: Component<ViewRendererProps> = (props) => {
  const { callFunction } = useExtensionsContext();
  const [initiated, setInitiated] = createSignal(false);
  const { context, setContext, extension } = useViewContext();
  let initFunction = "";
  let views: ExtensionView | ExtensionView[] = [];

  if (props.view === "configurationView") {
    views = props.spec.configurationView || [];
    initFunction = props.spec.lifecycle?.["on:initConfigurationView"] || "";
  } else if (props.view === "contentPieceView") {
    views = props.spec.contentPieceView || [];
    initFunction = props.spec.lifecycle?.["on:initContentPieceView"] || "";
  } else {
    const blockActionId = props.view.split(":")[1];
    const blockAction = props.spec.blockActions?.find((blockAction) => {
      return blockAction.id === blockActionId;
    });

    if (blockAction) {
      views = blockAction.view || [];
      initFunction = blockAction["on:init"] || "";
    }
  }

  if (!Array.isArray(views)) {
    views = [views];
  }

  if (initFunction && extension.id && extension.token) {
    callFunction(props.spec, initFunction, {
      context,
      extensionId: extension.id,
      token: extension.token
    }).then(() => {
      setInitiated(true);
    });
  } else {
    setInitiated(true);
  }

  return (
    <Show when={initiated()} fallback={<Loader />}>
      <For each={views}>{(el) => <ComponentRenderer spec={props.spec} view={el} />}</For>
    </Show>
  );
};

export { ViewRenderer };
