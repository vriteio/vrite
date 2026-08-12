import { Fragment } from "../fragment";
import { Dialog } from "@ark-ui/solid/dialog";
import clsx from "clsx";
import { type Component, createSignal, type JSX, splitProps } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import styles from "./styles.module.scss";

interface OverlayProps extends JSX.HTMLAttributes<HTMLDivElement> {
  opened: boolean;
  children?: JSX.Element;
  class?: string;
  shadeClass?: string;
  portal?: boolean;
  wrapperClass?: string;
  onOverlayClick?(): void;
  closeOnEscape?: boolean;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  lockScroll?: boolean;
}

const Overlay: Component<OverlayProps> = (props) => {
  const [entryAnimationInProgress, setEntryAnimationInProgress] = createSignal(false);
  const [, passedProps] = splitProps(props, [
    "opened",
    "children",
    "class",
    "shadeClass",
    "portal",
    "onOverlayClick",
    "wrapperClass",
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
      persistentElements={[() => document.querySelector("[data-notifications]")]}
      onOpenChange={(details) => {
        if (!details.open && !entryAnimationInProgress()) {
          props.onOverlayClick?.();
        }
      }}
    >
      <Dynamic component={props.portal === false ? Fragment : Portal}>
        <Dialog.Positioner
          {...passedProps}
          class={clsx(
            ":base: fixed top-0 left-0 z-70 flex items-center justify-center w-[100dvw] h-[100dvh]",
            props.class
          )}
        >
          <Dialog.Backdrop
            class={clsx(
              styles.backdrop,
              ":base: absolute w-full h-full bg-gradient-to-b md:from-black md:from-opacity-20 md:to-black md:to-opacity-60 from-transparent via-black via-opacity-20 to-transparent",
              props.shadeClass
            )}
            onPointerDown={(event) => {
              if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName || "")) {
                event.preventDefault();
              }
            }}
          />
          <Dialog.Content
            class={clsx(styles.content, "z-0 outline-none", props.wrapperClass)}
            onAnimationStart={(event) => {
              if (event.currentTarget === event.target && props.opened) {
                setEntryAnimationInProgress(true);
              }
            }}
            onAnimationEnd={(event) => {
              if (event.currentTarget === event.target) {
                setEntryAnimationInProgress(false);
              }
            }}
            onAnimationCancel={(event) => {
              if (event.currentTarget === event.target) {
                setEntryAnimationInProgress(false);
              }
            }}
          >
            {props.children}
          </Dialog.Content>
        </Dialog.Positioner>
      </Dynamic>
    </Dialog.Root>
  );
};

export { Overlay };
