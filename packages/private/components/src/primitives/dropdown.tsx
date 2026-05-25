import { Card } from "./card";
import { Fragment } from "./fragment";
import { createRef } from "../ref";
import clsx from "clsx";
import {
  Component,
  ComponentProps,
  createContext,
  createEffect,
  createSignal,
  JSX,
  onCleanup,
  ParentComponent,
  Show,
  useContext
} from "solid-js";
import { Placement } from "@floating-ui/dom";
import { Dynamic, Portal } from "solid-js/web";
import { Menu } from "@ark-ui/solid/menu";

type Point = { x: number; y: number };
interface DropdownAreaProps {
  enabled?(event: PointerEvent | MouseEvent): boolean;
}
interface DropdownProps extends JSX.HTMLAttributes<HTMLDivElement> {
  cardProps?: Partial<ComponentProps<typeof Card>>;
  placement?: Placement | Placement[];
  children: JSX.Element;
  opened?: boolean;
  portal?: boolean;
  trigger?: Component<{ opened: boolean }>;
  setOpened?(opened: boolean): void;
}

const DropdownAreaContext = createContext<{
  onContextMenu(callback: (event: MouseEvent) => void): void;
}>({
  onContextMenu: () => {}
});
const DropdownArea: ParentComponent<DropdownAreaProps> = (props) => {
  const [onContextMenuCallbackRef, setOnContextMenuCallbackRef] = createRef<
    (event: MouseEvent) => void
  >(() => {});

  return (
    <DropdownAreaContext.Provider
      value={{
        onContextMenu(callback) {
          setOnContextMenuCallbackRef(callback);
        }
      }}
    >
      <div
        class="contents pointer-events-auto"
        onPointerDown={(event) => {
          const isContextMenu = event.button === 2;

          if (isContextMenu && (!props.enabled || props.enabled(event))) {
            event.stopPropagation();
            onContextMenuCallbackRef()(event);
          }
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
  const [anchorPoint, setAnchorPoint] = createSignal<Point | null>(null);
  const [ghostAnchorRef, setGhostAnchorRef] = createRef<HTMLElement | null>(null);
  const [activatorRef, setActivatorRef] = createRef<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const { onContextMenu } = useContext(DropdownAreaContext);
  const getAnchorElement = (): HTMLElement | null => {
    // If context menu point is set, use ghost anchor; otherwise use activator
    if (anchorPoint()) {
      return ghostAnchorRef();
    }

    return activatorRef()?.firstElementChild as HTMLElement | null;
  };
  const placement = () => {
    const fallbackPlacement = "bottom-start";
    if (Array.isArray(props.placement)) {
      return props.placement[0] || fallbackPlacement;
    }

    return props.placement || fallbackPlacement;
  };
  const closeContextMenu = () => {
    setOpened(false);
    setAnchorPoint(null);
  };

  const handleOpenChange = (details: { open: boolean }): void => {
    setOpened(details.open);

    if (!details.open) {
      setAnchorPoint(null);

      if (activeContextMenuClose === closeContextMenu) {
        activeContextMenuClose = null;
      }
    }
  };

  // Register with DropdownArea context for context menu handling
  createEffect(() => {
    onContextMenu((event) => {
      if (activeContextMenuClose && activeContextMenuClose !== closeContextMenu) {
        activeContextMenuClose();
      }

      setAnchorPoint({ x: event.clientX, y: event.clientY });
      setOpened(true);
      activeContextMenuClose = closeContextMenu;
      event.preventDefault();
      event.stopPropagation();
    });
  });
  onCleanup(() => {
    if (activeContextMenuClose === closeContextMenu) {
      activeContextMenuClose = null;
    }
  });
  createEffect(() => {
    if (typeof props.opened !== "undefined") {
      setOpened(props.opened);
    }
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });

  return (
    <Menu.Root
      open={opened()}
      onOpenChange={handleOpenChange}
      positioning={{
        flip: Array.isArray(props.placement) ? props.placement.slice(1) : true,
        offset: { mainAxis: 0 },
        placement: placement(),
        strategy: "fixed",
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
          class="fixed w-0 h-0 pointer-events-none"
          style={{
            top: `${anchorPoint()?.y || 0}px`,
            left: `${anchorPoint()?.x || 0}px`
          }}
        />
        <Show when={props.trigger}>
          <Menu.Trigger
            onClick={(event) => {
              event.stopPropagation();
            }}
            asChild={(triggerProps) => (
              <div ref={setActivatorRef} class="contents" {...triggerProps()}>
                <Dynamic component={props.trigger} opened={opened()} />
              </div>
            )}
          />
        </Show>
        <Dynamic component={props.portal === false ? Fragment : Portal}>
          <Menu.Positioner>
            <Menu.Content
              asChild={(contentProps) => (
                <Card
                  {...contentProps()}
                  {...(props.cardProps || {})}
                  style={{
                    "transform-origin": "var(--transform-origin)",
                    ...(props.cardProps?.style || {})
                  }}
                  shade
                  class={clsx(
                    `:base-2: z-50 flex flex-col p-1 transform min-w-32 rounded-[0.625rem] pointer-events-auto transition duration-150 shadow-black shadow-opacity-15`,
                    opened()
                      ? `:base-2: visible opacity-100`
                      : `:base-2: invisible opacity-0 !shadow-none`,
                    props.cardProps?.class
                  )}
                >
                  <div class="overflow-auto scrollbar-sm flex-1 min-w-fit">{props.children}</div>
                </Card>
              )}
            />
          </Menu.Positioner>
        </Dynamic>
      </div>
    </Menu.Root>
  );
};

export { Dropdown, DropdownArea };
