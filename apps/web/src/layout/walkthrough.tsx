import {
  Accessor,
  ParentComponent,
  Setter,
  Show,
  createContext,
  createSignal,
  onCleanup,
  useContext
} from "solid-js";
import { mdiArrowTopLeftBottomRight, mdiClose } from "@mdi/js";
import { Presence, Motion } from "solid-motionone";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { createRef } from "#lib/utils";

interface WalkthroughContextData {
  activeWalkthrough: Accessor<string | null>;
  setActiveWalkthrough: Setter<string | null>;
}

const WalkthroughContext = createContext<WalkthroughContextData>();
const WalkthroughProvider: ParentComponent = (props) => {
  const [activeWalkthrough, setActiveWalkthrough] = createSignal<string | null>(null);
  const [height, setHeight] = createSignal(36 * 16);
  const [width, setWidth] = createSignal(28 * 16);
  const [dragging, setDragging] = createSignal(false);
  const [startingPosition, setStartingPosition] = createRef({ x: 0, y: 0 });
  const [startingSize, setStartingSize] = createRef({ w: 0, h: 0 });
  const minWidth = 20 * 16;
  const maxWidth = 40 * 16;
  const minHeight = 20 * 16;
  const maxHeight = 40 * 16;
  const onPointerMove = (event: MouseEvent): void => {
    if (dragging()) {
      const newWidth = startingSize().w + (startingPosition().x || 0) - event.x;
      const newHeight = startingSize().h + (startingPosition().y || 0) - event.y;

      setWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)));
      setHeight(Math.max(minHeight, Math.min(maxHeight, newHeight)));
      event.preventDefault();
      event.stopPropagation();
    }
  };
  const onPointerUp = (): void => {
    setDragging(false);
  };
  const onPointerLeave = (): void => {
    setDragging(false);
  };

  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointerleave", onPointerLeave);
  onCleanup(() => {
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointerleave", onPointerLeave);
  });

  return (
    <WalkthroughContext.Provider
      value={{
        activeWalkthrough,
        setActiveWalkthrough
      }}
    >
      {props.children}
      <Presence exitBeforeEnter>
        <Show when={activeWalkthrough()}>
          <Motion
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.1 }}
            transition={{ duration: 0.5, easing: "ease-out" }}
            class="origin-bottom-right"
          >
            <div class="fixed bottom-8 right-2">
              <Card
                class="p-0 relative overflow-hidden flex flex-col"
                style={{
                  width: `${width()}px`,
                  height: `${height()}px`
                }}
              >
                <div class="h-12 w-full flex justify-start items-center px-2">
                  <Tooltip text="Resize" side="right" class="ml-1" fixed>
                    <IconButton
                      path={mdiArrowTopLeftBottomRight}
                      onPointerDown={(event) => {
                        setDragging(true);
                        setStartingPosition({
                          x: event.x,
                          y: event.y
                        });
                        setStartingSize({
                          w: width(),
                          h: height()
                        });
                      }}
                      class="m-0"
                      variant="text"
                      text="soft"
                    />
                  </Tooltip>
                  <div class="flex-1" />
                  <Tooltip text="Close" side="left" class="-ml-1" fixed>
                    <IconButton
                      onClick={() => {
                        setActiveWalkthrough(null);
                      }}
                      path={mdiClose}
                      class="m-0"
                      variant="text"
                      text="soft"
                    />
                  </Tooltip>
                </div>
                <iframe src={activeWalkthrough() || ""} class="flex-1 w-full" />
                <Show when={dragging()}>
                  <div class="h-full w-full absolute top-0 left-0 " />
                </Show>
              </Card>
            </div>
          </Motion>
        </Show>
      </Presence>
    </WalkthroughContext.Provider>
  );
};
const useWalkthrough = (): WalkthroughContextData => {
  return useContext(WalkthroughContext)!;
};

export { WalkthroughProvider, useWalkthrough };
