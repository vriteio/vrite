import type { Card } from "../card";
import { createRef } from "../../ref";
import clsx from "clsx";
import {
  type Component,
  type ComponentProps,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  onCleanup,
  type ParentComponent,
  Show,
  useContext
} from "solid-js";
import { type Placement } from "@floating-ui/dom";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";
import { createMediaQuery } from "@solid-primitives/media";
import { Fragment } from "../fragment";
import { DropdownDesktopMenu } from "./dropdown-desktop-menu";
import { DropdownProvider, useDropdown, useDropdownContext } from "./dropdown-context";
import { DropdownMobileContent, DropdownMobileSheet } from "./dropdown-mobile-sheet";
import { useDropdownLongPress } from "./use-dropdown-long-press";

interface Point {
  x: number;
  y: number;
}

interface DropdownAreaProps {
  enabled?(event: PointerEvent | MouseEvent): boolean;
  longPressDelay?: number;
  longPressTolerance?: number;
  onLongPress?(event: PointerEvent): void;
}
interface DropdownProps extends JSX.HTMLAttributes<HTMLDivElement> {
  anchorPoint?: Point | null;
  cardProps?: Partial<ComponentProps<typeof Card>>;
  disabled?: boolean;
  placement?: Placement | Placement[];
  children: JSX.Element;
  opened?: boolean;
  portal?: boolean;
  positioningStrategy?: "absolute" | "fixed";
  trigger?: Component<{ contextMenu: boolean; opened: boolean }>;
  title?: string;
  offset?: { mainAxis?: number; crossAxis?: number };
  mobileSheetDragFromContent?: boolean;
  mobileNavigationBackAvailable?: boolean;
  mobileNavigationTitle?: string;
  onContextMenuChange?(contextMenu: boolean): void;
  onMobileNavigationBack?(): void;
  onPlacementChange?(placement: Placement): void;
  setOpened?(opened: boolean): void;
  sameWidth?: boolean;
}

interface DropdownAreaContextValue {
  onContextMenu(callback: (event: MouseEvent | PointerEvent) => void): void;
}

const DropdownAreaContext = createContext<DropdownAreaContextValue>({
  onContextMenu: () => {}
});
const DropdownArea: ParentComponent<DropdownAreaProps> = (props) => {
  const [onContextMenuCallbackRef, setOnContextMenuCallbackRef] = createRef<
    (event: MouseEvent | PointerEvent) => void
  >(() => {});
  const longPress = useDropdownLongPress({
    delay: props.longPressDelay,
    enabled: (event) => !props.enabled || props.enabled(event),
    onLongPress: (event) => {
      props.onLongPress?.(event);
      onContextMenuCallbackRef()(event);
    },
    tolerance: props.longPressTolerance
  });

  return (
    <DropdownAreaContext.Provider
      value={{
        onContextMenu(callback) {
          setOnContextMenuCallbackRef(callback);
        }
      }}
    >
      <div
        {...longPress}
        class="contents pointer-events-auto"
        onPointerDown={(event) => {
          const isContextMenu = event.button === 2;

          if (isContextMenu && (!props.enabled || props.enabled(event))) {
            event.stopPropagation();
            onContextMenuCallbackRef()(event);
            return;
          }

          longPress.onPointerDown(event);
        }}
        onContextMenu={(event) => {
          if (!props.enabled || props.enabled(event)) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        {props.children}
      </div>
    </DropdownAreaContext.Provider>
  );
};
let activeContextMenuClose: (() => void) | null = null;

const Dropdown: Component<DropdownProps> = (props) => {
  const mobileDropdownId = Symbol("mobile-dropdown");
  const md = createMediaQuery("(min-width: 768px)");
  const [contextAnchorPoint, setContextAnchorPoint] = createSignal<Point | null>(null);
  const [ghostAnchorRef, setGhostAnchorRef] = createRef<HTMLElement | null>(null);
  const [activatorRef, setActivatorRef] = createRef<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const [closing, setClosing] = createSignal(false);
  const {
    activeMobileDropdown: getActiveMobileDropdown,
    closeMobileDropdowns,
    mobileDropdownStack,
    removeMobileDropdown,
    setMobileDropdownStack
  } = useDropdownContext();
  const { onContextMenu } = useContext(DropdownAreaContext);
  const positioningStrategy = () => props.positioningStrategy || "fixed";
  const desktopPortal = () => props.portal !== false || positioningStrategy() === "fixed";
  const toPositioningPoint = (point: Point): Point => {
    if (positioningStrategy() !== "absolute") return point;

    const offsetParent = ghostAnchorRef()?.offsetParent;
    const offsetParentRect = offsetParent?.getBoundingClientRect();
    const scrollLeft = offsetParent instanceof HTMLElement ? offsetParent.scrollLeft : 0;
    const scrollTop = offsetParent instanceof HTMLElement ? offsetParent.scrollTop : 0;

    return {
      x: point.x - (offsetParentRect?.left || 0) + scrollLeft,
      y: point.y - (offsetParentRect?.top || 0) + scrollTop
    };
  };
  const externalAnchorPoint = createMemo(() => {
    return props.anchorPoint ? toPositioningPoint(props.anchorPoint) : null;
  });
  const anchorPoint = () => contextAnchorPoint() || externalAnchorPoint();
  const mobileDropdownIndex = () => {
    return mobileDropdownStack().findIndex((entry) => entry.id === mobileDropdownId);
  };
  const activeMobileDropdown = () => {
    return getActiveMobileDropdown()?.id === mobileDropdownId;
  };
  const mobileDropdownHost = () => mobileDropdownIndex() === 0;
  const getAnchorElement = (): HTMLElement | null => {
    // If context menu point is set, use ghost anchor; otherwise use activator
    if (anchorPoint()) {
      return ghostAnchorRef();
    }

    return activatorRef()?.firstElementChild as HTMLElement | null;
  };
  const placement = () => {
    if (Array.isArray(props.placement)) {
      return props.placement[0] || "bottom-start";
    }

    return props.placement || "bottom-start";
  };
  const finishClose = () => {
    setOpened(false);
    setContextAnchorPoint(null);
    removeMobileDropdown(mobileDropdownId);

    if (activeContextMenuClose === closeDropdown) {
      activeContextMenuClose = null;
    }
  };
  const closeDropdown = () => {
    if (!md() && opened()) {
      if (closing()) return;
      setClosing(true);
    } else {
      setClosing(false);
      finishClose();
    }
  };
  const closeDropdownImmediately = () => {
    setClosing(false);
    finishClose();
  };
  const handleOpenChange = (details: { open: boolean }): void => {
    if (!details.open) {
      if (md()) closeDropdown();

      return;
    }

    setClosing(false);
    setOpened(true);
  };

  // Register with DropdownArea context for context menu handling
  createEffect(() => {
    onContextMenu((event) => {
      const reopenCurrentDropdown = opened();

      if (md() && activeContextMenuClose && activeContextMenuClose !== closeDropdown) {
        activeContextMenuClose();
      }

      const openContextMenu = () => {
        setContextAnchorPoint(toPositioningPoint({ x: event.clientX, y: event.clientY }));
        handleOpenChange({ open: true });
        if (md()) activeContextMenuClose = closeDropdown;
      };

      if (reopenCurrentDropdown) {
        closeDropdown();
        queueMicrotask(openContextMenu);
      } else {
        openContextMenu();
      }

      event.preventDefault();
      event.stopPropagation();
    });
  });
  onCleanup(() => {
    if (activeContextMenuClose === closeDropdown) {
      activeContextMenuClose = null;
    }

    removeMobileDropdown(mobileDropdownId);
  });
  createEffect(() => {
    const stackIndex = mobileDropdownIndex();

    if (!md() && opened() && stackIndex === -1) {
      setMobileDropdownStack((stack) => [
        ...stack,
        {
          id: mobileDropdownId,
          close: closeDropdown,
          closeImmediately: closeDropdownImmediately,
          getCardProps: () => props.cardProps,
          getClosing: closing,
          getDragFromContent: () => props.mobileSheetDragFromContent !== false,
          getNavigationBackAvailable: () => Boolean(props.mobileNavigationBackAvailable),
          getNavigationTitle: () => props.mobileNavigationTitle,
          getTitle: () => props.title,
          onNavigationBack: () => props.onMobileNavigationBack?.()
        }
      ]);
    } else if ((md() || !opened()) && stackIndex !== -1) {
      removeMobileDropdown(mobileDropdownId);
    }
  });
  createEffect(
    on(
      () => props.opened,
      (externalOpened) => {
        if (typeof externalOpened === "undefined") return;

        if (externalOpened) handleOpenChange({ open: true });
        else if (opened()) {
          if (md()) closeDropdown();
          else if (mobileDropdownIndex() > 0) closeDropdownImmediately();
          else closeMobileDropdowns();
        }
      }
    )
  );
  createEffect(() => {
    props.setOpened?.(opened());
  });
  createEffect(() => {
    props.onContextMenuChange?.(contextAnchorPoint() !== null);
  });
  return (
    <Menu.Root
      open={opened()}
      onOpenChange={handleOpenChange}
      onInteractOutside={(event) => {
        if (!md()) event.preventDefault();
      }}
      positioning={{
        flip: Array.isArray(props.placement) ? props.placement.slice(1) : true,
        offset: {
          mainAxis: props.offset?.mainAxis ?? 4,
          crossAxis: props.offset?.crossAxis ?? 0
        },
        placement: placement(),
        sameWidth: md() && props.sameWidth,
        strategy: positioningStrategy(),
        getAnchorElement,
        async updatePosition(data) {
          await data.updatePosition();

          const content = data.floatingElement?.querySelector<HTMLElement>('[data-part="content"]');
          const resolvedPlacement = content?.getAttribute("data-placement") as Placement | null;

          if (resolvedPlacement) props.onPlacementChange?.(resolvedPlacement);
        }
      }}
      unmountOnExit
      lazyMount
      loopFocus
    >
      <div
        class={clsx(":base: relative flex items-center focus:outline-none", props.class)}
        style={props.style}
        tabindex="0"
      >
        {/* Ghost anchor for context menu positioning */}
        <Dynamic component={positioningStrategy() === "fixed" ? Portal : Fragment}>
          <div
            ref={setGhostAnchorRef}
            class={clsx(
              "w-0 h-0 pointer-events-none",
              positioningStrategy() === "absolute" ? "absolute" : "fixed"
            )}
            style={{
              top: `${anchorPoint()?.y || 0}px`,
              left: `${anchorPoint()?.x || 0}px`
            }}
          />
        </Dynamic>
        <Show when={props.trigger}>
          <Menu.Trigger
            disabled={props.disabled}
            onClick={(event) => {
              event.stopPropagation();
              if (!md() && opened()) closeMobileDropdowns();
            }}
            asChild={(triggerProps) => (
              <div ref={setActivatorRef} class="contents" {...triggerProps()}>
                <Dynamic
                  component={props.trigger}
                  contextMenu={contextAnchorPoint() !== null}
                  opened={opened()}
                />
              </div>
            )}
          />
        </Show>
        <Show
          when={md()}
          fallback={
            <>
              <DropdownMobileSheet host={mobileDropdownHost()} />
              <DropdownMobileContent active={activeMobileDropdown()} opened={opened()}>
                {props.children}
              </DropdownMobileContent>
            </>
          }
        >
          <DropdownDesktopMenu
            cardProps={props.cardProps}
            opened={opened()}
            portal={desktopPortal()}
          >
            {props.children}
          </DropdownDesktopMenu>
        </Show>
      </div>
    </Menu.Root>
  );
};

export { Dropdown, DropdownArea, DropdownProvider, useDropdown };
