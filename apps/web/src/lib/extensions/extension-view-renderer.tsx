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
  onCleanup,
  onMount,
  Setter,
  Show,
  useContext
} from "solid-js";
import { mdiAlertCircle } from "@mdi/js";
import { ExtensionDetails } from "#context";
import { Icon, Loader } from "#components/primitives";

type ExtensionViewRendererProps<O> = {
  extension: ExtensionDetails;
  contentEditable?: boolean;
  view?: "configurationView" | "contentPieceView" | `blockActionView:${string}`;
  viewId?: string;
  onInitiated?(): void;
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
  const { sandbox } = props.extension;
  const spec = sandbox?.spec;

  let viewId = props.viewId || "";
  let error: Error | null = null;
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
      viewId = spec?.configurationView || "";
    } else if (props.view === "contentPieceView") {
      viewId = spec?.contentPieceView || "";
    } else {
      const [, blockActionId] = (props.view || ":").split(":");
      const blockAction = spec?.blockActions?.find((blockAction) => {
        return blockAction.id === blockActionId;
      });

      if (blockAction) {
        viewId = blockAction.view || "";
      }
    }

    if (viewId && sandbox && props.extension.id && props.extension.token) {
      sandbox
        .generateView<C>(viewId, props.ctx, props.func)
        .then((generatedView) => {
          view = generatedView;
          setInitiated(true);
          props.onInitiated?.();
        })
        .catch((caughtError) => {
          error = caughtError;
          setInitiated(true);
        });
    } else {
      setInitiated(true);
    }
  });
  onCleanup(() => {
    sandbox?.removeScope(`view:${viewId}`);
  });

  return (
    <ExtensionViewContext.Provider
      value={{
        extension: props.extension,
        envData: sandbox!.envData,
        setEnvData: sandbox!.setEnvData
      }}
    >
      <Show
        when={initiated() && view && !error}
        fallback={
          <div class="h-full w-full flex justify-center items-center">
            <Show when={initiated() && error} fallback={<Loader />}>
              <div class=" text-gray-500 dark:text-gray-400 flex gap-1 justify-center items-center">
                <Icon path={mdiAlertCircle} class="h-5 w-5" />
                <span>Couldn't load the view</span>
              </div>
            </Show>
          </div>
        }
      >
        <ComponentRenderer
          spec={props.extension.spec}
          contentEditable={props.contentEditable}
          view={view!}
        />
      </Show>
    </ExtensionViewContext.Provider>
  );
};
const useViewContext = (): ExtensionViewContextData => {
  return useContext(ExtensionViewContext)!;
};

export { ExtensionViewRenderer, useViewContext };
