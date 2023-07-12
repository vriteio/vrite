import { EmbedAttributes } from "./node";
import { EmbedMenu } from "./menu";
import { NodeViewWrapper, useSolidNodeView } from "@vrite/tiptap-solid";
import { Component, createSignal, Show } from "solid-js";
import clsx from "clsx";
import { mdiCodepen, mdiYoutube } from "@mdi/js";
import { Card, Icon } from "#components/primitives";
import { codeSandboxIcon } from "#assets/icons";
import { EmbedType, createRef } from "#lib/utils";

const getPlaceholderIcon = (embedType?: EmbedType): string => {
  switch (embedType) {
    case "codesandbox":
      return codeSandboxIcon;
    case "codepen":
      return mdiCodepen;
    case "youtube":
      return mdiYoutube;
    default:
      return "";
  }
};
const EmbedView: Component = () => {
  const { state } = useSolidNodeView<EmbedAttributes>();
  const [error] = createSignal(false);
  const selected = (): boolean => {
    return state().selected;
  };
  const attrs = (): EmbedAttributes => {
    return state().node.attrs;
  };

  return (
    <NodeViewWrapper>
      <div class={clsx("relative rounded-2xl my-5", selected() && "ring ring-primary ring-2")}>
        <Show
          when={attrs().src}
          fallback={
            <div
              class={clsx(
                "pt-[35%] w-full rounded-t-2xl bg-gradient-to-tr flex justify-center items-center relative"
              )}
            >
              <div class="absolute flex flex-col items-center justify-center font-bold text-white transform -translate-y-1/2 top-1/2">
                <Icon
                  path={getPlaceholderIcon(state().node.attrs.embed as EmbedType)}
                  class="w-16 h-16"
                />
                <Show when={error()}>
                  <span class="absolute top-full">Error</span>
                </Show>
              </div>
            </div>
          }
        >
          <iframe
            src={attrs().src || ""}
            class="object-contain w-full m-0 transition-opacity duration-300 border-2 border-gray-200 dark:border-gray-700 aspect-video min-h-96 rounded-t-2xl"
          />
        </Show>

        <Card class="m-0 border-t-0 rounded-t-none">
          <EmbedMenu state={state()} />
        </Card>
      </div>
    </NodeViewWrapper>
  );
};

export { EmbedView };
