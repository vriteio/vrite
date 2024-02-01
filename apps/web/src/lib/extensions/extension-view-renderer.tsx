import { ComponentRenderer } from "./component-renderer";
import { ContextFunctions, SerializedContext, UsableEnvData } from "./sandbox";
import { ContextObject, ExtensionBaseViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import {
  Accessor,
  createContext,
  createEffect,
  createSignal,
  JSX,
  on,
  onMount,
  Setter,
  Show,
  useContext
} from "solid-js";
import { ExtensionDetails, useExtensions } from "#context";
import { Loader } from "#components/primitives";

type ExtensionViewRendererProps<O> = {
  extension: ExtensionDetails;
  view: "configurationView" | "contentPieceView" | `blockActionView:${string}`;
} & O;

interface ExtensionViewContextData {
  extension: ExtensionDetails;
  envData: Accessor<ContextObject>;
  setEnvData: Setter<ContextObject>;
}

const ExtensionViewContext = createContext<ExtensionViewContextData>();
const ExtensionViewRenderer = <C extends ExtensionBaseViewContext>(
  props: ExtensionViewRendererProps<{
    ctx: SerializedContext<C>;
    func: ContextFunctions<C>;
    usableEnvData: UsableEnvData<C>;
    onUsableEnvDataUpdate?(usableEnvData: UsableEnvData<C>): void;
  }>
): JSX.Element => {
  const [initiated, setInitiated] = createSignal(false);
  const { getExtensionSandbox } = useExtensions();
  const sandbox = getExtensionSandbox(props.extension.spec.name);
  const runtimeSpec = sandbox?.runtimeSpec;

  let viewId = "";
  let view: ExtensionElement | null = null;

  createEffect(
    on(
      () => props.usableEnvData,
      () => {
        sandbox?.setEnvData((envData) => {
          return {
            ...envData,
            ...props.usableEnvData
          };
        });
      }
    )
  );
  createEffect(
    on(sandbox!.envData, (value) => {
      if (value !== props.usableEnvData) {
        props.onUsableEnvDataUpdate?.({
          ...props.usableEnvData,
          ...value
        });
      }
    })
  );
  onMount(() => {
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

    if (viewId && sandbox && props.extension.id && props.extension.token) {
      sandbox.generateView<C>(viewId, props.ctx, props.func).then((generatedView) => {
        view = generatedView;
        setInitiated(true);
      }) || null;
    } else {
      setInitiated(true);
    }
  });

  return (
    <ExtensionViewContext.Provider
      value={{
        extension: props.extension,
        envData: sandbox!.envData,
        setEnvData: sandbox!.setEnvData
      }}
    >
      <Show when={initiated() && view} fallback={<Loader />}>
        <ComponentRenderer spec={props.extension.spec} view={view!} />
      </Show>
    </ExtensionViewContext.Provider>
  );
};
const useViewContext = (): ExtensionViewContextData => {
  return useContext(ExtensionViewContext)!;
};

export { ExtensionViewRenderer, useViewContext };
