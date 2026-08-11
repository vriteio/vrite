import { Fragment } from "./fragment";
import { Dialog } from "@ark-ui/solid/dialog";
import clsx from "clsx";
import { type Component, createSignal, type JSX, splitProps } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";

interface OverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  opened: boolean;
  children?: JSX.Element;
  class?: string;
  shadeClass?: string;
  portal?: boolean;
  wrapperClass?: string;
  hiddenClass?: string;
  onOverlayClick?(): void;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  lockScroll?: boolean;
}

const Overlay: Component<OverlayProps> = (props) => {
  const [transitionInProgress, setTransitionInProgress] = createSignal(false);
  const [, passedProps] = splitProps(props, [
    "opened",
    "children",
    "class",
    "shadeClass",
    "portal",
    "onOverlayClick",
    "wrapperClass",
    "hiddenClass",
    "closeOnEscape",
    "trapFocus",
    "restoreFocus",
    "lockScroll"
  ]);

  return (
    <Dialog.Root
      open={props.opened}
      modal
      trapFocus={props.trapFocus !== false}
      preventScroll={props.lockScroll !== false}
      restoreFocus={props.restoreFocus !== false}
      closeOnEscape={props.closeOnEscape !== false}
      onOpenChange={(details) => {
        if (!details.open && !transitionInProgress()) {
          props.onOverlayClick?.();
        }
      }}
    >
      <Dynamic component={props.portal ? Portal : Fragment}>
        <Dialog.Positioner
          {...passedProps}
          class={clsx(
            `:base: fixed top-0 left-0 z-50 flex items-center justify-center w-[100dvw] h-[100dvh] transition-all duration-300 transform`,
            props.opened
              ? "opacity-100 visible backdrop-blur-sm"
              : props.hiddenClass || "opacity-0 invisible",
            props.class
          )}
          onTransitionStart={() => setTransitionInProgress(true)}
          onTransitionEnd={() => setTransitionInProgress(false)}
        >
          <Dialog.Backdrop
            class={clsx(
              `:base: absolute w-full h-full bg-gradient-to-b from-black from-opacity-20 to-black to-opacity-60`,
              props.shadeClass
            )}
            onPointerDown={(event) => {
              if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
                event.preventDefault();
              }
            }}
          />
          <Dialog.Content
            class={clsx(
              "z-0 transition-all duration-300 outline-none",
              !props.opened && "translate-y-5 opacity-0",
              props.wrapperClass
            )}
          >
            {props.children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Dynamic>
    </Dialog.Root>
  );
};

export { Overlay };
