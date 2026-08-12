import clsx from "clsx";
import { type Component, type JSX, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";
import { Card } from "../card";
import { useMobileDropdownDrag } from "./use-dropdown-mobile-drag";
import { useDropdownContext } from "./dropdown-context";
import styles from "./styles.module.scss";

interface DropdownMobileSheetProps {
  host: boolean;
}

interface DropdownMobileContentProps {
  active: boolean;
  children: JSX.Element;
  opened: boolean;
}

const DropdownMobileSheet: Component<DropdownMobileSheetProps> = (props) => {
  const {
    activeMobileDropdown,
    closeMobileDropdowns,
    finishClosingMobileDropdowns,
    mobileDropdownExpanded,
    mobileDropdownStack,
    navigateMobileDropdownBack,
    setMobileDropdownContentContainer,
    setMobileDropdownExpanded
  } = useDropdownContext();
  const opened = () => mobileDropdownStack().length > 0;
  const activeEntry = activeMobileDropdown;
  const previousTitle = () => {
    const stack = mobileDropdownStack();

    return stack.at(-2)?.getTitle();
  };
  const navigationTitle = () => {
    return activeEntry()?.getNavigationBackAvailable()
      ? activeEntry()?.getNavigationTitle()
      : previousTitle();
  };
  const cardProps = () => activeEntry()?.getCardProps();
  const drag = useMobileDropdownDrag({
    expanded: mobileDropdownExpanded,
    opened,
    close: closeMobileDropdowns,
    setExpanded: setMobileDropdownExpanded
  });

  return (
    <Show when={props.host && opened()}>
      <Portal>
        <Menu.Positioner class="!fixed !inset-0 !z-50 !transform-none flex select-none items-end pointer-events-none">
          <div
            {...drag.backdropGestureProps}
            class={clsx(
              styles.backdrop,
              "absolute inset-0 touch-none pointer-events-auto backdrop-blur-sm",
              "bg-gradient-to-b from-transparent via-black via-opacity-10 to-black to-opacity-20",
              activeEntry()?.getClosing() && styles.closing
            )}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeMobileDropdowns();
            }}
          />
          <Card
            {...(cardProps() || {})}
            data-dropdown-mobile-sheet
            shade
            style={{
              ...(cardProps()?.style || {}),
              "height": drag.height() ? `${drag.height()}px` : "auto",
              "max-height": "calc(100dvh - env(safe-area-inset-top, 0px))",
              "transform-origin": "bottom center",
              "transition": drag.dragging()
                ? "none"
                : "height 200ms ease, transform 200ms ease, opacity 200ms ease"
            }}
            onTransitionEnd={drag.onHeightTransitionEnd}
            onAnimationEnd={(event) => {
              const sheetAnimationEnded = event.currentTarget === event.target;

              if (sheetAnimationEnded && activeEntry()?.getClosing()) {
                finishClosingMobileDropdowns();
              }
            }}
            class={clsx(
              styles.sheet,
              ":base-2: fixed bottom-0 left-0 z-50 flex !w-full transform flex-col select-none rounded-b-none !border-0 p-1 pb-[calc(0.25rem+env(safe-area-inset-bottom,0px))] pointer-events-auto shadow-black shadow-opacity-15 shadow-xl",
              mobileDropdownExpanded() ? ":base-2: rounded-t-none" : ":base-2: rounded-t-2xl",
              activeEntry()?.getClosing() && styles.closing,
              cardProps()?.class
            )}
          >
            <div class="flex min-h-0 w-full flex-1 flex-col">
              <div
                {...drag.gestureProps}
                aria-hidden="true"
                class="flex h-6 w-full shrink-0 touch-none cursor-ns-resize items-center justify-center outline-none"
              >
                <span class="h-1.5 w-12 rounded-full bg-gray-200" />
              </div>
              <Show
                when={
                  activeEntry()?.getNavigationBackAvailable() || mobileDropdownStack().length > 1
                }
              >
                <button
                  type="button"
                  class="mb-0.5 flex min-h-7 w-full cursor-pointer items-center gap-1 rounded-md px-0.5 text-gray-700 outline-none @hover:bg-gray-100"
                  aria-label={navigationTitle() ? `Back to ${navigationTitle()}` : "Back"}
                  onClick={navigateMobileDropdownBack}
                >
                  <div class="flex h-6 w-6 shrink-0 items-center justify-center">
                    <div class="i-lucide:chevron-left h-5 w-5 text-gray-400" />
                  </div>
                  <span class="min-w-0 flex-1 truncate pr-7 text-center text-base font-medium">
                    {navigationTitle() ? `Back to ${navigationTitle()}` : "Back"}
                  </span>
                </button>
              </Show>
              <div
                {...(activeEntry()?.getDragFromContent() !== false ? drag.gestureProps : {})}
                class="min-h-0 w-full min-w-fit flex-1 overflow-auto scrollbar-sm flex flex-col [&>div]:contents"
                data-dropdown-mobile-scroll
                ref={setMobileDropdownContentContainer}
              />
            </div>
          </Card>
        </Menu.Positioner>
      </Portal>
    </Show>
  );
};

const DropdownMobileContent: Component<DropdownMobileContentProps> = (props) => {
  const { mobileDropdownContentContainer } = useDropdownContext();

  return (
    <Show when={props.opened ? mobileDropdownContentContainer() : null} keyed>
      {(container) => (
        <Portal mount={container}>
          <Menu.Content
            class="flex min-h-0 w-full min-w-fit flex-1 flex-col focus:outline-none"
            style={{ display: props.active ? undefined : "none" }}
          >
            {props.children}
          </Menu.Content>
        </Portal>
      )}
    </Show>
  );
};

export { DropdownMobileContent, DropdownMobileSheet };
