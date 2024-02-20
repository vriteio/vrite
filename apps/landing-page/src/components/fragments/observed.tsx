import clsx from "clsx";
import { createEffect, createSignal, JSX, on, onMount, ParentComponent } from "solid-js";
import { Dynamic } from "solid-js/web";
import { createRef } from "#lib/ref";

interface ObservedProps {
  class?: string;
  style?: JSX.CSSProperties;
  inViewClass?: string;
  outOfViewClass?: string;
  immediate?: boolean;
  as?: string;
  onInView?: () => void;
  onOutOfView?: () => void;
}

const Observed: ParentComponent<ObservedProps> = (props) => {
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [inView, setInView] = createSignal(false);

  onMount(() => {
    const container = containerRef();

    if (props.immediate) {
      setInView(true);

      return;
    }

    if (container) {
      new IntersectionObserver(([entry], observer) => {
        const intersecting = entry?.isIntersecting || false;

        setInView(intersecting);

        if (intersecting) {
          observer.unobserve(container);
          observer.disconnect();
        }
      }).observe(container);
    }
  });
  createEffect(
    on(
      [inView],
      () => {
        if (inView()) {
          props.onInView?.();
        } else {
          props.onOutOfView?.();
        }
      },
      { defer: true }
    )
  );

  return (
    <Dynamic
      component={props.as || "div"}
      ref={setContainerRef}
      class={clsx(props.class, inView() ? props.inViewClass : props.outOfViewClass)}
      style={props.style}
    >
      {props.children}
    </Dynamic>
  );
};

export { Observed };
