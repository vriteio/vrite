import { Overlay } from "./overlay";
import { Card } from "./card";
import { createRef } from "../ref";
import clsx from "clsx";
import {
  Component,
  ComponentProps,
  createEffect,
  createSignal,
  JSX,
  on,
  onCleanup,
  onMount,
  Show
} from "solid-js";
import { computePosition, flip, hide, Placement, size } from "@floating-ui/dom";
import { Dynamic } from "solid-js/web";

interface DropdownProps extends JSX.SelectHTMLAttributes<HTMLSelectElement> {
  class?: string;
  cardProps?: ComponentProps<typeof Card>;
  placement?: Placement;
  fixed?: boolean;
  children: JSX.Element;
  opened?: boolean;
  autoFocus?: boolean;
  overlay?: boolean;
  attachActivatorHandler?: boolean;
  activatorButton: Component<{ opened: boolean }>;
  setOpened?(opened: boolean): void;
}

const Dropdown: Component<DropdownProps> = (props) => {
  const [buttonRef, setButtonRef] = createRef<HTMLElement | null>(null);
  const [boxRef, setBoxRef] = createRef<HTMLElement | null>(null);
  const [opened, setOpened] = createSignal(props.opened || false);
  const computeDropdownPosition = (): void => {
    const button = buttonRef();
    const box = boxRef();

    if (button && box) {
      computePosition(button, box, {
        middleware: [
          flip(),
          hide(),
          size({
            padding: 16,
            apply({ availableWidth, availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxWidth: `${availableWidth}px`,
                maxHeight: `${availableHeight}px`
              });
            }
          })
        ],
        placement: props.placement || "bottom-start",
        strategy: props.fixed ? "fixed" : "absolute"
      }).then(({ x, y }) => {
        box.style.top = `${y}px`;
        box.style.left = `${x}px`;
      });
    }
  };

  onMount(() => {
    computeDropdownPosition();
    new ResizeObserver(() => {
      computeDropdownPosition();
    }).observe(boxRef()!);
  });
  createEffect(() => {
    setOpened(props.opened || false);
  });
  createEffect(() => {
    props.setOpened?.(opened());
  });
  createEffect(
    on(opened, (opened) => {
      if (opened && props.autoFocus !== false) {
        computeDropdownPosition();
        boxRef()?.focus();
      }
    })
  );
  createEffect(
    on([() => props.overlay, opened], ([overlay, opened]) => {
      const handleClick = (event: MouseEvent): void => {
        if (!boxRef()?.contains(event.target as Node)) {
          setOpened(false);
          event.preventDefault();
          event.stopPropagation();
        }
      };

      if (!overlay && opened) {
        document.body.addEventListener("click", handleClick);
      }

      onCleanup(() => {
        document.body.removeEventListener("click", handleClick);
      });
    })
  );

  return (
    <div
      class={clsx(":base: relative flex items-center focus:outline-none", props.class)}
      tabindex="0"
    >
      <Show when={props.overlay !== false}>
        <Overlay
          shadeClass="bg-transparent"
          class={clsx(!opened() && "pointer-events-none h-0 w-0")}
          opened={opened()}
          onOverlayClick={() => setOpened(false)}
        />
      </Show>
      <div
        ref={setButtonRef}
        onClick={() => {
          if (props.attachActivatorHandler !== false) {
            setOpened(!opened());
          }
        }}
        class="flex"
      >
        <Dynamic component={props.activatorButton} opened={opened()} />
      </div>
      <Card
        {...props.cardProps}
        class={clsx(
          `:base-2: z-50 flex flex-col p-1 overflow-hidden transform shadow-2xl`,
          props.fixed ? "fixed" : "absolute",
          opened() ? `:base-2: visible opacity-100` : `:base-2: invisible opacity-0`,
          props.cardProps?.class
        )}
        ref={setBoxRef}
      >
        {props.children}
      </Card>
    </div>
  );
};

export { Dropdown };
