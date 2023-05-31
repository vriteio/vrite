import { ComponentRenderer } from "./component-renderer";
import { useViewContext } from "./view-context";
import { ExtensionSpec, ExtensionView } from "@vrite/extensions";
import { Loader } from "#components/primitives";
import { Component, For, Show, createSignal } from "solid-js";
import { useExtensionsContext } from "#context";

interface ViewRendererProps {
  spec: ExtensionSpec;
  view: "configurationView" | "contentPieceView";
}

const ViewRenderer: Component<ViewRendererProps> = (props) => {
  const { callFunction } = useExtensionsContext();
  const { context, setContext, extension } = useViewContext();
  const initEventName = `on:init${props.view[0].toUpperCase()}${props.view.slice(1)}` as
    | "on:initConfigurationView"
    | "on:initContentPieceView";
  const initView = props.spec.lifecycle?.[initEventName];
  const [initiated, setInitiated] = createSignal(false);

  if (initView && extension.id && extension.token) {
    callFunction(props.spec, initView, {
      context,
      setContext,
      extensionId: extension.id,
      token: extension.token
    }).then(() => {
      setInitiated(true);
    });
  } else {
    setInitiated(true);
  }

  let views: ExtensionView | ExtensionView[] = props.spec[props.view]!;

  if (!Array.isArray(views)) {
    views = [views];
  }

  return (
    <Show when={initiated()} fallback={<Loader />}>
      <For each={views}>{(el) => <ComponentRenderer spec={props.spec} view={el} />}</For>
    </Show>
  );
};

export { ViewRenderer };
