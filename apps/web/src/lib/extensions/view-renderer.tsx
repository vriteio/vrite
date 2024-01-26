import { ComponentRenderer, ExtensionView } from "./component-renderer";
import { useViewContext } from "./view-context";
import { ExtensionElement, ExtensionSpec } from "@vrite/sdk/extensions";
import { Component, For, Show, createSignal } from "solid-js";
import { Loader } from "#components/primitives";
import { useExtensions } from "#context";

interface ViewRendererProps {
  spec: ExtensionSpec;
  view: "configurationView" | "contentPieceView" | `blockActionView:${string}`;
}

const ViewRenderer: Component<ViewRendererProps> = (props) => {
  const { getExtensionSandbox } = useExtensions();
  const [initiated, setInitiated] = createSignal(false);
  const { extension } = useViewContext();
  const sandbox = getExtensionSandbox(extension.spec.name);
  const runtimeSpec = sandbox?.runtimeSpec;

  let viewId = "";
  let view: ExtensionElement | null = null;

  if (props.view === "configurationView") {
    viewId = runtimeSpec?.configurationView || "";
  } else if (props.view === "contentPieceView") {
    viewId = runtimeSpec?.contentPieceView || "";
  } else {
    const [, blockActionId] = props.view.split(":");
    const blockAction = runtimeSpec?.blockActions?.find((blockAction) => {
      return blockAction.id === blockActionId;
    });

    if (blockAction) {
      viewId = blockAction.view || "";
    }
  }

  if (viewId && sandbox && extension.id && extension.token) {
    sandbox.generateView(viewId, {}, {}).then((generatedView) => {
      view = generatedView;
      setInitiated(true);
    }) || null;
  } else {
    setInitiated(true);
  }

  return (
    <Show when={initiated() && view} fallback={<Loader />}>
      <ComponentRenderer spec={props.spec} view={view!} />
    </Show>
  );
};

export { ViewRenderer };
