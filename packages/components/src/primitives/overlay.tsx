import { Fragment } from "./fragment";
import clsx from "clsx";
import { Component, JSX } from "solid-js";
import { Dynamic, Portal } from "solid-js/web";

interface OverlayProps {
  opened: boolean;
  children?: JSX.Element;
  class?: string;
  shadeClass?: string;
  portal?: boolean;
  onOverlayClick?(): void;
}

const Overlay: Component<OverlayProps> = (props) => {
  return (
    <Dynamic component={props.portal ? Portal : Fragment}>
      <div
        class={clsx(
          `:base: fixed top-0 left-0 z-50 flex items-center justify-center w-screen h-screen transition duration-300 transform`,
          props.opened ? "opacity-100 visible" : "opacity-0 invisible",
          props.class
        )}
      >
        <div
          class={clsx(`:base: absolute w-full h-full bg-gray-900 opacity-80`, props.shadeClass)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.onOverlayClick?.();
          }}
        />
        <div class="z-0">{props.children}</div>
      </div>
    </Dynamic>
  );
};

export { Overlay };
