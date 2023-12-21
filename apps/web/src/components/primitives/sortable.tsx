import {
  Accessor,
  Component,
  ComponentProps,
  createEffect,
  createSignal,
  For,
  JSX,
  on,
  ParentComponent
} from "solid-js";
import { Dynamic } from "solid-js/web";
import Sortable from "sortablejs";

interface WrapperProps {
  children?: JSX.Element;
  ref<E extends HTMLElement>(element: E): void;
}
interface SortableProps<D, W extends ParentComponent<WrapperProps> | keyof JSX.IntrinsicElements> {
  each: readonly D[] | undefined | null | false;
  wrapper: W;
  wrapperProps: ComponentProps<W>;
  options?: Sortable.Options;
  fallback?: JSX.Element;
  ref?(element: HTMLElement): void;
  children(item: D, index: Accessor<number>): JSX.Element;
}

const SortableComponent = <D, W extends Component<WrapperProps> | keyof JSX.IntrinsicElements>(
  props: SortableProps<D, W>
): JSX.Element => {
  const [wrapperRef, setWrapperRef] = createSignal<HTMLElement | null>(null);
  const [sortable, setSortable] = createSignal<Sortable | null>(null);
  const ref = (element: HTMLElement): void => {
    props.ref?.(element);
    setWrapperRef(() => element);
  };

  createEffect(
    on([wrapperRef, () => props.options], ([wrapperRef, options]) => {
      if (wrapperRef) {
        const currentSortable = sortable();

        if (currentSortable) {
          currentSortable.destroy();
        }

        setSortable(
          Sortable.create(wrapperRef, {
            ...(options || {}),
            delayOnTouchOnly: true,
            delay: 500
          })
        );
      }
    })
  );

  return (
    <Dynamic {...(props.wrapperProps || {})} ref={ref} component={props.wrapper}>
      <For each={props.each} fallback={props.fallback}>
        {props.children}
      </For>
    </Dynamic>
  );
};

export { SortableComponent as Sortable };
