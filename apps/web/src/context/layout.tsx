import { createContext, type ParentComponent, createEffect, useContext, on } from "solid-js";
import { createStore, type SetStoreFunction } from "solid-js/store";
import { getRequestEvent } from "solid-js/web";
import { parseLayoutCookie } from "#web/lib/validation";

interface Layout {
  leftSidePanelWidth: number;
  rightSidePanelWidth: number;
}

const defaultLayout: Layout = {
  leftSidePanelWidth: 0,
  rightSidePanelWidth: 0
};

const readCookieValue = (cookieHeader: string, name: string) => {
  const prefix = `${name}=`;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
};

const readLayoutCookie = () => {
  const event = getRequestEvent();

  if (event) {
    const layoutCookie = readCookieValue(event.request.headers.get("cookie") || "", "layout");
    const parsedLayout = parseLayoutCookie(layoutCookie);

    return {
      ...defaultLayout,
      ...(parsedLayout ?? {})
    } satisfies Layout;
  }

  if (typeof document === "undefined") {
    return defaultLayout;
  }

  const layoutCookie = readCookieValue(document.cookie, "layout");
  const parsedLayout = parseLayoutCookie(layoutCookie);

  return {
    ...defaultLayout,
    ...(parsedLayout ?? {})
  } satisfies Layout;
};
const LayoutContext = createContext<{
  layout: Layout;
  setLayout: SetStoreFunction<Layout>;
}>();
const LayoutProvider: ParentComponent = (props) => {
  const [layout, setLayout] = createStore<Layout>(readLayoutCookie());

  createEffect(
    on(
      () => [layout.leftSidePanelWidth, layout.rightSidePanelWidth] as const,
      ([leftSidePanelWidth, rightSidePanelWidth]) => {
        document.cookie = `layout=${encodeURIComponent(
          JSON.stringify({
            leftSidePanelWidth,
            rightSidePanelWidth
          })
        )}; path=/; SameSite=Lax`;
      },
      { defer: true }
    )
  );

  return (
    <LayoutContext.Provider
      value={{
        layout,
        setLayout
      }}
    >
      {props.children}
    </LayoutContext.Provider>
  );
};
const useLayout = () => useContext(LayoutContext)!;

export { LayoutProvider, useLayout };
export type { Layout };
