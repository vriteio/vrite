import { EmbedAttributes } from "./node";
import { EmbedMenu } from "./menu";
import { NodeViewWrapper, useSolidNodeView } from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on, onCleanup, onMount, Show } from "solid-js";
import clsx from "clsx";
import { mdiCodepen, mdiYoutube } from "@mdi/js";
import { Portal } from "solid-js/web";
import { computePosition, size } from "@floating-ui/dom";
import { debounce } from "@solid-primitives/scheduled";
import { Icon } from "#components/primitives";
import { codeSandboxIcon } from "#assets/icons";
import { EmbedType, breakpoints, createRef } from "#lib/utils";
import { dragVerticalIcon } from "#assets/icons/drag-vertical";

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
  const [referenceContainerRef, setReferenceContainerRef] = createRef<HTMLElement | null>(null);
  const [menuContainerRef, setMenuContainerRef] = createRef<HTMLElement | null>(null);
  const { state } = useSolidNodeView<EmbedAttributes>();
  const [error] = createSignal(false);
  const selected = (): boolean => {
    return state().selected;
  };
  const isTopLevel = (): boolean => {
    return state().editor.state.doc.resolve(state().getPos()).parent.type.name === "doc";
  };
  const attrs = (): EmbedAttributes => {
    return state().node.attrs;
  };
  const repositionMenu = (): void => {
    if (!selected()) return;

    const referenceContainer = referenceContainerRef();
    const menuContainer = menuContainerRef();

    if (!referenceContainer || !menuContainer) return;

    computePosition(referenceContainer, menuContainer, {
      strategy: "fixed",
      middleware: [
        size({
          apply({ availableWidth, elements }) {
            const md = breakpoints.md();
            const width = Math.min(availableWidth, 448);

            Object.assign(elements.floating.style, {
              maxWidth: md ? `${width}px` : "100vw",
              display: md && width < 160 ? "none" : ""
            });
          }
        })
      ]
    }).then(({ x, y }) => {
      menuContainer.style.top = `${y + 8}px`;

      if (breakpoints.md()) {
        menuContainer.style.left = `${x}px`;
      } else {
        menuContainer.style.left = `${-8}px`;
      }
    });
  };
  const debouncedRepositionMenu = debounce(repositionMenu, 250);
  const containerResizeObserver = new ResizeObserver(() => {
    debouncedRepositionMenu();
  });

  createEffect(on(selected, repositionMenu));
  state().editor.on("update", repositionMenu);
  onMount(() => {
    const container = referenceContainerRef();

    if (!container) return;

    containerResizeObserver.observe(container);
    window.addEventListener("resize", debouncedRepositionMenu);
  });
  onCleanup(() => {
    containerResizeObserver.disconnect();
    window.removeEventListener("resize", debouncedRepositionMenu);
    state().editor.off("update", repositionMenu);
  });

  return (
    <NodeViewWrapper>
      <div
        class={clsx(
          "relative select-none rounded-2xl min-w-64 group",
          selected() && "ring ring-primary ring-2"
        )}
        ref={setReferenceContainerRef}
      >
        <div
          class={clsx(
            "text-gray-500 dark:text-gray-400 absolute left-[calc(-1.5rem-2px)] z-10 opacity-0 group-hover:opacity-100",
            (!isTopLevel() || !breakpoints.md()) && "hidden"
          )}
          data-drag-handle
        >
          <Icon
            path={dragVerticalIcon}
            class="h-6 w-6"
            stroke="currentColor"
            stroke-stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width={2}
            onMouseDown={() => {
              state().editor.commands.setNodeSelection(state().getPos());
            }}
          />
        </div>
        <Show
          when={attrs().src}
          fallback={
            <div
              class={clsx(
                "pt-[35%] w-full rounded-2xl bg-gradient-to-tr flex justify-center items-center relative border-2 border-gray-300 dark:border-gray-700"
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
            class="object-contain w-full m-0 transition-opacity duration-300 border-2 border-gray-300 dark:border-gray-700 aspect-video min-h-96 rounded-2xl"
          />
        </Show>
        <Portal mount={document.getElementById("pm-container") || document.body}>
          <div
            ref={setMenuContainerRef}
            class={clsx(
              "w-screen md:w-full justify-center items-center z-1 pointer-events-none fixed",
              selected() ? "flex" : "hidden"
            )}
          >
            <EmbedMenu state={state()} />
          </div>
        </Portal>
      </div>
    </NodeViewWrapper>
  );
};

export { EmbedView };
