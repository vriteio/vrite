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
import { Dynamic } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";
import { createMediaQuery } from "@solid-primitives/media";
import { DropdownDesktopMenu } from "./dropdown-desktop-menu";
import { DropdownMobileSheet } from "./dropdown-mobile-sheet";
import { useDropdownLongPress } from "./use-dropdown-long-press";

type Point = { x: number; y: number };

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
  offset?: { mainAxis?: number; crossAxis?: number };
  mobileSheetDragFromContent?: boolean;
  onContextMenuChange?(contextMenu: boolean): void;
  setOpened?(opened: boolean): void;
}

const DropdownAreaContext = createContext<{
  onContextMenu(callback: (event: MouseEvent | PointerEvent) => void): void;
}>({
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
  const md = createMediaQuery("(min-width: 768px)");
  const [contextAnchorPoint, setContextAnchorPoint] = createSignal<Point | null>(null);
  const [ghostAnchorRef, setGhostAnchorRef] = createRef<HTMLElement | null>(null);
  const [activatorRef, setActivatorRef] = createRef<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const [closing, setClosing] = createSignal(false);
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let contextMenuFrame: number | null = null;
  const { onContextMenu } = useContext(DropdownAreaContext);
  const positioningStrategy = () => props.positioningStrategy || "fixed";
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
    closeTimer = null;
    setOpened(false);
    setContextAnchorPoint(null);

    if (activeContextMenuClose === closeDropdown) {
      activeContextMenuClose = null;
    }
  };
  const closeDropdown = () => {
    if (!md() && opened()) {
      if (closing()) return;
      setClosing(true);
      closeTimer = setTimeout(finishClose, 200);
    } else {
      setClosing(false);
      finishClose();
    }
  };
  const handleOpenChange = (details: { open: boolean }): void => {
    if (!details.open) {
      closeDropdown();
      return;
    }

    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = null;
    setClosing(false);
    setOpened(true);
  };

  // Register with DropdownArea context for context menu handling
  createEffect(() => {
    onContextMenu((event) => {
      const reopenCurrentDropdown = opened();

      if (activeContextMenuClose && activeContextMenuClose !== closeDropdown) {
        activeContextMenuClose();
      }

      const openContextMenu = () => {
        setContextAnchorPoint(toPositioningPoint({ x: event.clientX, y: event.clientY }));
        handleOpenChange({ open: true });
        activeContextMenuClose = closeDropdown;
      };

      if (reopenCurrentDropdown) {
        closeDropdown();
        if (contextMenuFrame !== null) cancelAnimationFrame(contextMenuFrame);
        contextMenuFrame = requestAnimationFrame(() => {
          contextMenuFrame = null;
          openContextMenu();
        });
      } else {
        openContextMenu();
      }

      event.preventDefault();
      event.stopPropagation();
    });
  });
  onCleanup(() => {
    if (contextMenuFrame !== null) cancelAnimationFrame(contextMenuFrame);
    if (closeTimer) clearTimeout(closeTimer);

    if (activeContextMenuClose === closeDropdown) {
      activeContextMenuClose = null;
    }
  });
  createEffect(
    on(
      () => props.opened,
      (externalOpened) => {
        if (typeof externalOpened === "undefined") return;

        if (externalOpened) handleOpenChange({ open: true });
        else if (opened()) closeDropdown();
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
        strategy: positioningStrategy(),
        getAnchorElement
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
        <Show when={props.trigger}>
          <Menu.Trigger
            disabled={props.disabled}
            onClick={(event) => {
              event.stopPropagation();
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
            <DropdownMobileSheet
              cardProps={props.cardProps}
              closing={closing()}
              dragFromContent={props.mobileSheetDragFromContent !== false}
              opened={opened()}
              onClose={() => handleOpenChange({ open: false })}
            >
              {props.children}
            </DropdownMobileSheet>
          }
        >
          <DropdownDesktopMenu cardProps={props.cardProps} opened={opened()} portal={props.portal}>
            {props.children}
          </DropdownDesktopMenu>
        </Show>
      </div>
    </Menu.Root>
  );
};

export { Dropdown, DropdownArea };
