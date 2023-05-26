import { ComponentRenderer } from "./component-renderer";
import { useViewContext } from "./view-context";
import { ExtensionSpec, ExtensionView } from "@vrite/extensions";
import { Component, For, Show, createSignal } from "solid-js";
import { useExtensionsContext } from "#context";

interface ViewRendererProps {
  extension: ExtensionSpec;
  view: "configurationView" | "contentPieceView";
}

const ViewRenderer: Component<ViewRendererProps> = (props) => {
  const { callFunction } = useExtensionsContext();
  const { context, setContext } = useViewContext();
  const initView =
    props.extension.lifecycle?.[`on:init${props.view[0].toUpperCase()}${props.view.slice(1)}`];
  const [initiated, setInitiated] = createSignal(false);

  if (initView) {
    callFunction(props.extension, initView, { context, setContext }).then(() => {
      setInitiated(true);
    });
  } else {
    setInitiated(true);
  }

  let views: ExtensionView | ExtensionView[] = props.extension[props.view]!;

  if (!Array.isArray(views)) {
    views = [views];
  }

  return (
    <Show when={initiated()}>
      <For each={views}>{(el) => <ComponentRenderer spec={props.extension} view={el} />}</For>
    </Show>
  );
};

export { ViewRenderer };
