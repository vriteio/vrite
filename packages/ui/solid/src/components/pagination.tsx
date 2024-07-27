import {
  Accessor,
  Component,
  JSX,
  ParentComponent,
  Setter,
  Show,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  splitProps,
  useContext
} from "solid-js";
import { Dynamic } from "solid-js/web";

type SeparatorItem = { type: "separator" };
type PageItem = { type: "page"; page: number; active?: boolean };
type PaginationItem = SeparatorItem | PageItem;

interface PaginationContextData {
  page: Accessor<number>;
  total: Accessor<number>;
  setPage: Setter<number>;
  visiblePages: Accessor<number>;
}
interface PaginationRootProps {
  total: number;
  value?: number;
  visiblePages?: number;
  setValue?(page: number): void;
}
interface PaginationPreviousProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        disabled: boolean;
        page?: number;
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}
interface PaginationItemsProps {
  children: Component<{
    items: PaginationItem[];
  }>;
}
interface PaginationSeparatorProps
  extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?: keyof JSX.IntrinsicElements | ParentComponent;
}
interface PaginationItemUIProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        page: number;
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
  item: PageItem;
  children?: JSX.Element;
}
interface PaginationNextProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        disabled: boolean;
        page?: number;
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
}

const PaginationContext = createContext<PaginationContextData>();
const usePagination = (): PaginationContextData => {
  return useContext(PaginationContext)!;
};
const PaginationRoot: ParentComponent<PaginationRootProps> = (props) => {
  const [page, setPage] = createSignal(props.value || 1);

  createEffect(() => {
    setPage(props.value || 1);
  });
  createEffect(() => {
    props.setValue?.(page());
  });

  return (
    <PaginationContext.Provider
      value={{
        page,
        total: () => props.total,
        setPage,
        visiblePages: () => props.visiblePages || 5
      }}
    >
      {props.children}
    </PaginationContext.Provider>
  );
};
const PaginationPrevious: ParentComponent<PaginationPreviousProps> = (props) => {
  const { page, setPage } = usePagination();
  const [, passProps] = splitProps(props, ["as", "children"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      aria-label="Next page"
      disabled={page() <= 1}
      page={page() >= 1 ? page() - 1 : undefined}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        if (page() >= 1) {
          setPage(page() - 1);
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
const PaginationItems: Component<PaginationItemsProps> = (props) => {
  const { page, total, visiblePages } = usePagination();
  const items = createMemo(() => {
    const items: PaginationItem[] = [];

    if (!visiblePages() || total() <= visiblePages()) {
      for (let i = 1; i <= total(); i++) {
        items.push({ type: "page", page: i, active: i === page() });
      }
    } else {
      const half = Math.floor(visiblePages() / 2);

      let closest: "start" | "end" | "center" = "center";

      if (page() <= Math.ceil(visiblePages() / 2)) {
        closest = "start";
      } else if (page() >= total() - half) {
        closest = "end";
      }

      if (closest === "start") {
        for (let i = 1; i <= visiblePages() - 1; i++) {
          items.push({ type: "page", page: i, active: i === page() });
        }

        items.push({ type: "separator" });
        items.push({ type: "page", page: total(), active: total() === page() });
      } else if (closest === "end") {
        items.push({ type: "page", page: 1, active: 1 === page() });
        items.push({ type: "separator" });

        for (let i = total() - visiblePages() + 2; i <= total(); i++) {
          items.push({ type: "page", page: i, active: i === page() });
        }
      } else {
        items.push({ type: "page", page: 1, active: 1 === page() });
        items.push({ type: "separator" });

        for (let i = page() - half; i <= page() + half; i++) {
          items.push({ type: "page", page: i, active: i === page() });
        }

        items.push({ type: "separator" });
        items.push({ type: "page", page: total(), active: total() === page() });
      }
    }

    return items;
  });

  return <Dynamic component={props.children} items={items()} />;
};
const PaginationItemUI: Component<PaginationItemUIProps> = (props) => {
  const { setPage } = usePagination();
  const [, passProps] = splitProps(props, ["item", "as", "children", "onClick"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      page={props.item.page}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        setPage(props.item.page);

        if (typeof props.onClick === "function") {
          props.onClick(event);
        }
      }}
    >
      <Show when={props.children} fallback={props.item.page}>
        {props.children}
      </Show>
    </Dynamic>
  );
};
const PaginationSeparator: ParentComponent<PaginationSeparatorProps> = (props) => {
  const [, passProps] = splitProps(props, ["as", "children"]);

  return (
    <Dynamic {...passProps} component={props.as || "div"} aria-hidden="true">
      {props.children}
    </Dynamic>
  );
};
const PaginationNext: ParentComponent<PaginationNextProps> = (props) => {
  const { total, page, setPage } = usePagination();
  const [, passProps] = splitProps(props, ["as", "children"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "button"}
      aria-label="Next page"
      disabled={page() >= total()}
      page={page() < total() ? page() + 1 : undefined}
      onClick={(event: MouseEvent & { currentTarget: HTMLElement; target: Element }) => {
        if (page() < total()) {
          setPage(page() + 1);
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
const Pagination = {
  Root: PaginationRoot,
  Previous: PaginationPrevious,
  Items: PaginationItems,
  Item: PaginationItemUI,
  Separator: PaginationSeparator,
  Next: PaginationNext
};

export { Pagination };
export type { PageItem, SeparatorItem, PaginationItem };
