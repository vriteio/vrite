import { ImageAttributes, ImageOptions } from "./node";
import { ImageMenu } from "./menu";
import { NodeViewWrapper, useSolidNodeView } from "@vrite/tiptap-solid";
import {
  Component,
  createEffect,
  createSignal,
  Show,
  on,
  onCleanup,
  onMount,
  Match,
  Switch
} from "solid-js";
import clsx from "clsx";
import { mdiAlertCircle, mdiImage } from "@mdi/js";
import { debounce } from "@solid-primitives/scheduled";
import { computePosition, size } from "@floating-ui/dom";
import { Portal } from "solid-js/web";
import { createActiveElement } from "@solid-primitives/active-element";
import { breakpoints, createRef, validateURL } from "#lib/utils";
import { Icon, Loader } from "#components/primitives";
import { dragVerticalIcon } from "#assets/icons/drag-vertical";

const ImageView: Component = () => {
  const { state } = useSolidNodeView<ImageAttributes>();
  const activeElement = createActiveElement();
  const [error, setError] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [currentSrc, setCurrentSrc] = createSignal("");
  const [imageContainerRef, setImageContainerRef] = createRef<HTMLElement | null>(null);
  const [referenceContainerRef, setReferenceContainerRef] = createRef<HTMLElement | null>(null);
  const [menuContainerRef, setMenuContainerRef] = createRef<HTMLElement | null>(null);
  const [initialResize, setInitialResize] = createRef(true);
  const updateWidth = debounce((width: string) => state().updateAttributes({ width }), 250);
  const updateAspectRatio = debounce(
    (aspectRatio: string) => state().updateAttributes({ aspectRatio }),
    250
  );
  const options = (): ImageOptions => state().extension.options;
  const selected = (): boolean => {
    if (state().selected && options().cover) {
      const editorFocused =
        !activeElement() || Boolean(state().editor.view.dom.contains(activeElement()));

      if (!editorFocused) {
        state().editor.commands.setTextSelection(0);
      }

      return editorFocused;
    }

    return state().selected;
  };
  const isTopLevel = (): boolean => {
    return state().editor.state.doc.resolve(state().getPos()).parent.type.name === "doc";
  };
  const attrs = (): ImageAttributes => {
    return state().node.attrs;
  };
  const repositionMenu = (): void => {
    if (!selected()) return;
    if (options().cover) return;

    const referenceContainer = referenceContainerRef();
    const menuContainer = menuContainerRef();

    if (!referenceContainer || !menuContainer) return;

    computePosition(referenceContainer, menuContainer, {
      strategy: "fixed",
      middleware: [
        size({
          apply({ availableWidth, elements }) {
            const md = breakpoints.md();
            const width = Math.min(availableWidth, options().cover ? 316 : 448);

            Object.assign(elements.floating.style, {
              maxWidth: md ? `${width}px` : "100vw",
              display: md && width < 160 ? "none" : ""
            });
          }
        })
      ]
    }).then(({ x, y }) => {
      menuContainer.style.top = `${y + 8 - (options().cover ? 48 : 0)}px`;

      if (breakpoints.md() || options().cover) {
        menuContainer.style.left = `${x}px`;
      } else {
        menuContainer.style.left = `${-8}px`;
      }
    });
  };
  const debouncedRepositionMenu = debounce(repositionMenu, 10);
  const imageResizeObserver = new ResizeObserver(([entry]) => {
    if (loading()) return;

    if (initialResize()) {
      setInitialResize(false);

      return;
    }

    const containerWidth = entry.target.parentElement?.clientWidth || entry.target.clientWidth;
    const newWidth = `${Math.round((entry.target.clientWidth / containerWidth) * 1000) / 10}%`;

    updateWidth.clear();

    if (newWidth !== attrs().width && state().editor.isEditable) {
      updateWidth(newWidth);
    }
  });
  const containerResizeObserver = new ResizeObserver(() => {
    debouncedRepositionMenu();
  });
  const removeImage = (): void => {
    if (currentSrc()) {
      setCurrentSrc("");
    }
  };
  const getImage = debounce(async (src?: string): Promise<void> => {
    setError(false);
    setLoading(true);

    if (src === currentSrc()) {
      setLoading(false);

      return;
    }

    removeImage();

    if (!src) {
      setError(false);
      setLoading(false);
      setCurrentSrc("");

      return;
    }

    if (!validateURL(src)) {
      setError(true);
      setLoading(false);

      return;
    }

    setCurrentSrc(src);
  }, 350);
  const handleNewImageContainer = (element: HTMLElement): void => {
    const imageContainer = imageContainerRef();

    if (imageContainer) {
      imageResizeObserver.unobserve(imageContainer);
    }

    imageResizeObserver.observe(element);
    setImageContainerRef(element);
  };
  const getPaddingTop = (): string => {
    const { width, aspectRatio } = attrs();

    if (aspectRatio && width) {
      return `calc(${1 / Number(aspectRatio)} * ${width})`;
    } else if (aspectRatio) {
      return `${(1 / Number(aspectRatio)) * 100}%`;
    }

    return options().cover ? "45%" : "35%";
  };

  createEffect(
    on(
      () => attrs().src,
      (src, previousSrc) => {
        if (src === previousSrc) {
          setLoading(false);
        } else {
          getImage.clear();
          getImage(src);
        }

        return src;
      }
    )
  );
  createEffect(on(selected, repositionMenu));
  state().editor.on("update", repositionMenu);
  onMount(() => {
    const container = referenceContainerRef();

    if (!container) return;

    containerResizeObserver.observe(container);
    window.addEventListener("resize", debouncedRepositionMenu);
  });
  onCleanup(() => {
    imageResizeObserver.disconnect();
    containerResizeObserver.disconnect();
    window.removeEventListener("resize", debouncedRepositionMenu);
    state().editor.off("update", repositionMenu);
  });

  return (
    <NodeViewWrapper>
      <div
        class={clsx(
          "rounded-2xl select-none min-w-64",
          state().editor.isEditable && !options().cover && selected() && "ring-primary ring-2"
        )}
      >
        <div
          class={clsx("border-gray-200 dark:border-gray-700 relative group rounded-2xl border")}
          ref={setReferenceContainerRef}
        >
          <Show when={state().editor.isEditable}>
            <div
              class={clsx(
                "text-gray-500 dark:text-gray-400 absolute left-[calc(-1.5rem-2px)] z-10 opacity-0 group-hover:opacity-100",
                (!isTopLevel() || !breakpoints.md() || options().cover) && "hidden"
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
          </Show>
          <div
            class={clsx(
              "w-full border-gray-200 dark:border-gray-700 flex justify-center items-center overflow-hidden bg-gray-100 dark:bg-gray-800 relative",
              !error() && !loading() && currentSrc() ? "" : "opacity-0 !absolute",
              "rounded-2xl"
            )}
          >
            <div
              class={clsx(
                "overflow-hidden min-w-40 !h-full",
                state().editor.isEditable && "resize"
              )}
              ref={handleNewImageContainer}
              style={{ width: attrs().width }}
            >
              <img
                alt={attrs().alt}
                src={currentSrc()}
                class={clsx("object-contain w-full m-0 transition-opacity duration-300")}
                onLoad={(event) => {
                  setError(false);
                  setLoading(false);

                  const image = event.currentTarget;
                  const w = image.naturalWidth;
                  const h = image.naturalHeight;
                  const aspectRatio = w / h;

                  updateAspectRatio.clear();
                  updateAspectRatio(`${aspectRatio}`);
                }}
                onError={() => {
                  if (!currentSrc()) return;

                  setLoading(false);
                  removeImage();
                  setError(true);
                }}
              />
            </div>
          </div>
          <Show when={loading() || !currentSrc()}>
            <div
              class={clsx(
                "w-full bg-gradient-to-tr flex justify-center items-center relative",
                "rounded-2xl"
              )}
              style={{
                "padding-top": getPaddingTop()
              }}
            >
              <div class="absolute flex flex-col items-center justify-center font-bold text-white transform -translate-y-1/2 top-1/2">
                <Show when={!loading()} fallback={<Loader class="w-8 h-8" />}>
                  <Show
                    when={!error()}
                    fallback={
                      <>
                        <Icon path={mdiAlertCircle} class="w-16 h-16" />
                      </>
                    }
                  >
                    <Icon path={mdiImage} class="w-16 h-16" />
                  </Show>
                </Show>
              </div>
            </div>
          </Show>
        </div>
        <Switch>
          <Match when={!state().editor.isEditable}>
            <></>
          </Match>
          <Match when={options().cover}>
            <div class="absolute bottom-2 left-2 w-[calc(100%-1rem)] flex items-center justify-center">
              <div
                ref={setMenuContainerRef}
                class={clsx(
                  "justify-center items-center z-60 pointer-events-none max-w-md",
                  selected() ? "flex" : "hidden"
                )}
              >
                <ImageMenu state={state()} />
              </div>
            </div>
          </Match>
          <Match when={!options().cover}>
            <Portal mount={document.getElementById("pm-container") || document.body}>
              <div
                ref={setMenuContainerRef}
                class={clsx(
                  "w-screen md:w-full justify-center items-center z-1 pointer-events-none fixed",
                  selected() ? "flex" : "hidden"
                )}
              >
                <ImageMenu state={state()} />
              </div>
            </Portal>
          </Match>
        </Switch>
      </div>
    </NodeViewWrapper>
  );
};

export { ImageView };
