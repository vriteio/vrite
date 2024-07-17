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
  useContext
} from "solid-js";
import { scroll } from "seamless-scroll-polyfill";
import { Dynamic } from "solid-js/web";

interface TOCItem {
  label: string;
  children?: TOCItem[];
}
interface TOCContextData {
  activeId: Accessor<string>;
  getId(item: TOCItem): string;
}
interface TOCLevelProps {
  items: TOCItem[];
  children: ParentComponent<{ item: TOCItem; isActive(item: TOCItem): boolean }>;
}
interface TOCRootProps extends TOCLevelProps {
  idAttribute?: string;
  scrollContainer?: HTMLElement;
  offset?: number;
  getId(item: TOCItem): string;
}

const TOCContext = createContext<TOCContextData>();
const useTOC = (): TOCContextData => {
  return useContext(TOCContext)!;
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
            isActive={(item: TOCItem) => {
              return Boolean(activeId() && activeId() === getId(item));
            }}
          >
            <Show when={item.children?.length}>
              <TOCLevel items={item.children || []}>{props.children}</TOCLevel>
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
    return item ? props.getId(item) : "";
  };
  const [activeId, setActiveId] = createSignal(getId(props.items[0]));
  const scrollToActiveItem = (smooth?: boolean): void => {
    const item = activeId();
    const element = document.querySelector(`[${idAttribute()}="${item}"]`);

    if (!element) return;

    const rect = element.getBoundingClientRect();

    if (scrollContainer() === document.body) {
      const y = rect.top + window.scrollY - (props.offset || 0);

      scroll(window, {
        top: y,
        behavior: smooth === false ? "instant" : "smooth"
      });
    } else {
      const y = rect.top + scrollContainer().scrollTop - (props.offset || 0);

      scroll(scrollContainer(), {
        top: y,
        behavior: smooth === false ? "instant" : "smooth"
      });
    }
  };

  onMount(() => {
    const hash = location.hash.slice(1);
    const setCurrent: IntersectionObserverCallback = (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const { id } = entry.target;

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
        setActiveId(getId(props.items.at(-1)));
      } else if (isStart) {
        setActiveId(getId(props.items[0]));
      }
    };

    document
      .querySelectorAll(props.items.map((item) => `[${idAttribute()}="${getId(item)}"]`).join(", "))
      .forEach((element) => observer.observe(element));
    container?.addEventListener("scroll", handleScroll);
    onCleanup(() => {
      observer.disconnect();
      container?.removeEventListener("scroll", handleScroll);
    });

    if (hash) {
      setActiveId(hash);
      scrollToActiveItem(false);
    }
  });

  return (
    <TOCContext.Provider
      value={{
        activeId,
        getId
      }}
    >
      <TOCLevel items={props.items}>{props.children}</TOCLevel>
    </TOCContext.Provider>
  );
};
const TOC = {
  Root: TOCRoot
};

export { TOC };
