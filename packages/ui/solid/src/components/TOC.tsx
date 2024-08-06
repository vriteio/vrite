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
  Setter,
  createEffect,
  on
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
  options: Accessor<{
    useHash: boolean;
    idAttribute: string;
    scrollContainer: HTMLElement;
    offset: number;
    scrollBehavior: "instant" | "smooth";
  }>;
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
  useHash?: boolean;
  scrollBehavior?: "instant" | "smooth";
  getId?(item: TOCItem): string;
}

const TOCContext = createContext<TOCContextData>();
const useTOC = (): TOCContextData => {
  return useContext(TOCContext)!;
};
const scrollToElement = (
  selector: string,
  behavior?: "instant" | "smooth",
  options?: { scrollContainer?: HTMLElement; offset?: number }
): void => {
  const element = document.querySelector(selector);
  const scrollContainer = options?.scrollContainer || document.body;

  if (!element) return;

  const rect = element.getBoundingClientRect();

  if (scrollContainer === document.body) {
    const y = rect.top + window.scrollY - (options?.offset || 0);

    scroll(window, {
      top: y,
      behavior: behavior || "instant"
    });
  } else {
    const y = rect.top + scrollContainer.scrollTop - (options?.offset || 0);

    scroll(scrollContainer, {
      top: y,
      behavior: behavior || "instant"
    });
  }
};
const TOCItemUI: ParentComponent<TOCItemUIProps> = (props) => {
  const { getId, setActiveId, activeId, actions, options } = useTOC();
  const [, passProps] = splitProps(props, ["as", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        setActiveId(getId(props.item));
        actions.scrollToActiveItem();
        setActiveId(getId(props.item));

        if (options().useHash) {
          history.pushState({}, "", `#${activeId()}`);
        }

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
  const useHash = (): boolean => (typeof props.useHash === "boolean" ? props.useHash : true);
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
  const [activeId, setActiveId] = createSignal("");
  const scrollToActiveItem = (behavior?: "instant" | "smooth"): void => {
    const item = activeId();

    scrollToElement(`[${idAttribute()}="${item}"]`, behavior || props.scrollBehavior || "instant", {
      offset: props.offset,
      scrollContainer: scrollContainer()
    });
  };

  onMount(() => {
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
    const handleHashChange = (): void => {
      const hash = location.hash.slice(1);

      setActiveId(hash || getId(flattenItems()[0]));
    };
    const selector = flattenItems()
      .map((item) => `[${idAttribute()}="${getId(item)}"]`)
      .join(", ");
    const elements = selector ? document.querySelectorAll(selector) : [];

    elements.forEach((element) => observer.observe(element));
    container?.addEventListener("scroll", handleScroll);
    window.addEventListener("hashchange", handleHashChange);
    onCleanup(() => {
      observer.disconnect();
      container?.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleHashChange);
    });
    handleHashChange();
  });

  return (
    <TOCContext.Provider
      value={{
        activeId,
        setActiveId,
        getId,
        options: () => ({
          useHash: useHash(),
          idAttribute: idAttribute(),
          scrollContainer: scrollContainer(),
          offset: props.offset || 0,
          scrollBehavior: props.scrollBehavior || "instant"
        }),
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

export { TOC, scrollToElement };
export type { TOCItem };
