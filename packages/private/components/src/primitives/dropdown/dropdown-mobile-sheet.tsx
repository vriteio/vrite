import clsx from "clsx";
import { type Component, type ComponentProps, type JSX, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";
import { Card } from "../card";
import { useMobileDropdownDrag } from "./use-dropdown-mobile-drag";

interface DropdownMobileSheetProps {
  cardProps?: Partial<ComponentProps<typeof Card>>;
  children: JSX.Element;
  closing: boolean;
  opened: boolean;
  onClose(): void;
}

const DropdownMobileSheet: Component<DropdownMobileSheetProps> = (props) => {
  const drag = useMobileDropdownDrag({
    opened: () => props.opened,
    close: props.onClose
  });

  return (
    <Portal>
      <Menu.Positioner class="!fixed !inset-0 !z-50 !transform-none flex select-none items-end pointer-events-none">
        <Show when={props.opened}>
          <div
            {...drag.backdropGestureProps}
            class={clsx(
              "absolute inset-0 touch-none bg-black/40 pointer-events-auto backdrop-blur-sm transition-opacity duration-200",
              props.closing && "opacity-0"
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              props.onClose();
            }}
          />
        </Show>
        <Menu.Content
          asChild={(contentProps) => (
            <Card
              {...contentProps()}
              {...(props.cardProps || {})}
              data-dropdown-mobile-sheet
              shade
              style={{
                ...(props.cardProps?.style || {}),
                "height": drag.height() ? `${drag.height()}px` : "auto",
                "max-height": "calc(100dvh - env(safe-area-inset-top, 0px))",
                "transform-origin": "bottom center",
                "transition": drag.dragging()
                  ? "none"
                  : "height 200ms ease, transform 200ms ease, opacity 200ms ease"
              }}
              onTransitionEnd={drag.onHeightTransitionEnd}
              class={clsx(
                ":base-2: mobile-dropdown-sheet fixed bottom-0 left-0 z-50 flex !w-full transform flex-col select-none rounded-[0.625rem] rounded-b-none rounded-t-2xl !border-0 p-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] pointer-events-auto shadow-black shadow-opacity-15 shadow-xl transition duration-200",
                props.closing
                  ? ":base-2: visible translate-y-full opacity-100"
                  : ":base-2: visible translate-y-0 opacity-100",
                props.cardProps?.class
              )}
            >
              <div {...drag.gestureProps} class="flex min-h-0 w-full flex-1 flex-col">
                <div
                  aria-hidden="true"
                  class="flex h-5 w-full shrink-0 cursor-ns-resize items-center justify-center outline-none"
                >
                  <span class="h-1 w-10 rounded-full bg-gray-300" />
                </div>
                <div
                  class="min-h-0 w-full min-w-fit flex-1 overflow-auto scrollbar-sm"
                  data-dropdown-mobile-scroll
                >
                  {props.children}
                </div>
              </div>
            </Card>
          )}
        />
      </Menu.Positioner>
    </Portal>
  );
};

export { DropdownMobileSheet };
