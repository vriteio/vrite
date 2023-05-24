import clsx from "clsx";
import { createSignal, JSX, onMount, ParentComponent } from "solid-js";
import { createRef } from "#lib/ref";

interface ObservedProps {
  class?: string;
  style?: JSX.CSSProperties;
  inViewClass?: string;
  outOfViewClass?: string;
}

const Observed: ParentComponent<ObservedProps> = (props) => {
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [showed, setShowed] = createSignal(false);

  onMount(() => {
    const container = containerRef();

    if (container) {
      new IntersectionObserver(([entry], observer) => {
        const intersecting = entry?.isIntersecting || false;

        setShowed(intersecting);

        if (intersecting) {
          observer.unobserve(container);
          observer.disconnect();
        }
      }).observe(container);
    }
  });

  return (
    <div
      ref={setContainerRef}
      class={clsx(props.class, showed() ? props.inViewClass : props.outOfViewClass)}
      style={props.style}
    >
      {props.children}
    </div>
  );
};

export { Observed };
