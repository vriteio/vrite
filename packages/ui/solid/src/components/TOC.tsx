import {
  Component,
  For,
  onMount,
  onCleanup,
  createSignal,
  Show,
  ParentComponent,
  createContext,
  Accessor,
  useContext,
  createMemo,
  JSX,
  splitProps,
  Setter
} from "solid-js";
import { scroll } from "seamless-scroll-polyfill";
import { Dynamic } from "solid-js/web";

interface TOCItem {
  label: string;
  id?: string;
  children?: TOCItem[];
}
interface TOCContextData {
  activeId: Accessor<string>;
  setActiveId: Setter<string>;
  actions: {
    scrollToActiveItem(): void;
  };
  getId(item: TOCItem): string;
}
interface TOCItemUIProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
  item: TOCItem;
}
interface TOCLevelProps {
  items: TOCItem[];
  level: number;
  children: ParentComponent<{ item: TOCItem; isActive: boolean; level: number }>;
}
interface TOCRootProps extends Omit<TOCLevelProps, "level"> {
  idAttribute?: string;
  scrollContainer?: HTMLElement;
  offset?: number;
  getId?(item: TOCItem): string;
}

const TOCContext = createContext<TOCContextData>();
const useTOC = (): TOCContextData => {
  return useContext(TOCContext)!;
};
const TOCItemUI: ParentComponent<TOCItemUIProps> = (props) => {
  const { getId, setActiveId, actions } = useTOC();
  const [, passProps] = splitProps(props, ["as", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        setActiveId(getId(props.item));
        actions.scrollToActiveItem();
        setActiveId(getId(props.item));

        if (typeof props.onClick === "function") {
          props.onClick(event);
        }
      }}
    >
      {props.children}
    </Dynamic>
  );
};
const TOCLevel: Component<TOCLevelProps> = (props) => {
  const { activeId, getId } = useTOC();

  return (
    <For each={props.items}>
      {(item) => {
        return (
          <Dynamic
            component={props.children}
            item={item}
            isActive={Boolean(activeId() && activeId() === getId(item))}
            level={props.level}
          >
            <Show when={item.children?.length}>
              <TOCLevel items={item.children || []} level={props.level + 1}>
                {props.children}
              </TOCLevel>
            </Show>
          </Dynamic>
        );
      }}
    </For>
  );
};
const TOCRoot: Component<TOCRootProps> = (props) => {
  const idAttribute = (): string => props.idAttribute || "id";
  const scrollContainer = (): HTMLElement => props.scrollContainer || document.body;
  const getId = (item?: TOCItem): string => {
    return item ? item.id || props.getId?.(item) || "" : "";
  };
  const flattenItems = createMemo(() => {
    const output: TOCItem[] = [];
    const flatten = (items: TOCItem[]): void => {
      for (const item of items) {
        output.push(item);
        flatten(item.children || []);
      }
    };

    flatten(props.items);

    return output;
  });
  const [activeId, setActiveId] = createSignal(getId(flattenItems()[0]));
  const scrollToActiveItem = (): void => {
    const item = activeId();
    const element = document.querySelector(`[${idAttribute()}="${item}"]`);

    if (!element) return;

    const rect = element.getBoundingClientRect();

    if (scrollContainer() === document.body) {
      const y = rect.top + window.scrollY - (props.offset || 0);

      scroll(window, {
        top: y,
        behavior: "instant"
      });
    } else {
      const y = rect.top + scrollContainer().scrollTop - (props.offset || 0);

      scroll(scrollContainer(), {
        top: y,
        behavior: "instant"
      });
    }
  };

  onMount(() => {
    const hash = location.hash.slice(1);
    const setCurrent: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          setActiveId(entry.target.getAttribute(idAttribute()) || "");
          break;
        }
      }
    };
    const container = scrollContainer();
    const observerOptions: IntersectionObserverInit = {
      rootMargin: "-100px 0% -66%",
      threshold: 0
    };
    const observer = new IntersectionObserver(setCurrent, observerOptions);
    const handleScroll = (): void => {
      if (!container) return;

      const threshold = 50;
      const isEnd =
        container.scrollTop + container.clientHeight + threshold >= container.scrollHeight;
      const isStart = container.scrollTop <= threshold;

      if (isEnd) {
        setActiveId(getId(flattenItems().at(-1)));
      } else if (isStart) {
        setActiveId(getId(flattenItems()[0]));
      }
    };
    const selector = flattenItems()
      .map((item) => `[${idAttribute()}="${getId(item)}"]`)
      .join(", ");
    const elements = selector ? document.querySelectorAll(selector) : [];

    elements.forEach((element) => observer.observe(element));
    container?.addEventListener("scroll", handleScroll);
    onCleanup(() => {
      observer.disconnect();
      container?.removeEventListener("scroll", handleScroll);
    });

    if (hash) {
      setActiveId(hash);
      scrollToActiveItem();
    }
  });

  return (
    <TOCContext.Provider
      value={{
        activeId,
        setActiveId,
        getId,
        actions: {
          scrollToActiveItem
        }
      }}
    >
      <TOCLevel items={props.items} level={1}>
        {props.children}
      </TOCLevel>
    </TOCContext.Provider>
  );
};
const TOC = {
  Root: TOCRoot,
  Item: TOCItemUI
};

export { TOC };
export type { TOCItem };
