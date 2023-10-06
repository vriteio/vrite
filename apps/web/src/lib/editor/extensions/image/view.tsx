import { ImageAttributes, ImageOptions } from "./node";
import { ImageMenu } from "./menu";
import { NodeViewWrapper, useSolidNodeView } from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, Show, on, onCleanup } from "solid-js";
import clsx from "clsx";
import { mdiAlertCircle, mdiImage } from "@mdi/js";
import { debounce } from "@solid-primitives/scheduled";
import { createRef, validateURL } from "#lib/utils";
import { Icon, Loader } from "#components/primitives";

const ImageView: Component = () => {
  const { state } = useSolidNodeView<ImageAttributes>();
  const [error, setError] = createSignal(false);
  const [loading, setLoading] = createSignal(false);
  const [objectURL, setObjectURL] = createSignal("");
  const [currentSrc, setCurrentSrc] = createSignal("");
  const [imageContainerRef, setImageContainerRef] = createRef<HTMLElement | null>(null);
  const updateWidth = debounce((width: string) => state().updateAttributes({ width }), 250);
  const updateAspectRatio = debounce(
    (aspectRatio: string) => state().updateAttributes({ aspectRatio }),
    250
  );
  const options = (): ImageOptions => state().extension.options;
  const selected = (): boolean => {
    return state().selected;
  };
  const attrs = (): ImageAttributes => {
    return state().node.attrs;
  };
  const resizeObserver = new ResizeObserver(([entry]) => {
    const containerWidth = entry.target.parentElement?.clientWidth || entry.target.clientWidth;
    const newWidth = `${Math.round((entry.target.clientWidth / containerWidth) * 1000) / 10}%`;

    updateWidth.clear();

    if (newWidth !== attrs().width && state().editor.isEditable) {
      updateWidth(newWidth);
    }
  });
  const removeImage = (): void => {
    if (currentSrc()) {
      URL.revokeObjectURL(objectURL());
      setCurrentSrc("");
      setObjectURL("");
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
      resizeObserver.unobserve(imageContainer);
    }

    resizeObserver.observe(element);
    setImageContainerRef(element);
  };
  const getPaddingTop = (): string => {
    const { width, aspectRatio } = attrs();

    if (aspectRatio && width) {
      return `calc(${1 / Number(aspectRatio)} * ${width})`;
    } else if (aspectRatio) {
      return `${(1 / Number(aspectRatio)) * 100}%`;
    }

    return "35%";
  };

  onCleanup(() => {
    resizeObserver.disconnect();
  });
  createEffect(
    on(
      () => attrs().src,
      (src, previousSrc) => {
        if (src && src !== previousSrc) {
          getImage.clear();
          getImage(src);
        }

        return src;
      }
    )
  );

  return (
    <NodeViewWrapper>
      <div
        class={clsx(
          "relative rounded-2xl",
          !options().cover && selected() && "ring ring-primary ring-2"
        )}
      >
        <div
          class={clsx(
            "border-gray-200 dark:border-gray-700",
            options().cover ? "border-b-2" : "border-2 rounded-2xl"
          )}
        >
          <div
            class={clsx(
              "w-full border-gray-200 dark:border-gray-700 flex justify-center items-center overflow-hidden bg-gray-100 dark:bg-gray-800 relative",
              !error() && !loading() && currentSrc() ? "" : "opacity-0 !absolute",
              !options().cover && "rounded-2xl"
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
                options().cover ? "min-h-48" : "rounded-2xl"
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
                        <span class="absolute top-full">Error</span>
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
        <div
          class={clsx(
            "w-full justify-center items-center z-1 pointer-events-none",
            selected() ? "grid" : "hidden",
            options().cover ? "!flex relative" : "absolute -bottom-14"
          )}
        >
          <ImageMenu state={state()} />
        </div>
        <div data-type="draggable-item" />
      </div>
    </NodeViewWrapper>
  );
};

export { ImageView };
