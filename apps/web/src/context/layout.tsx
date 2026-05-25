import { createContext, ParentComponent, createEffect, useContext, on } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { getRequestEvent } from "solid-js/web";

type ActivePanel = "explorer" | "help";

interface Layout {
  leftSidePanelWidth: number;
  activePanel: ActivePanel;
}

const defaultLayout: Layout = {
  leftSidePanelWidth: 0,
  activePanel: "explorer"
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
    const parsedLayout = layoutCookie ? JSON.parse(decodeURIComponent(layoutCookie)) : null;

    return {
      ...defaultLayout,
      ...(parsedLayout ?? {})
    } satisfies Layout;
  }

  if (typeof document === "undefined") {
    return defaultLayout;
  }

  const layoutCookie = readCookieValue(document.cookie, "layout");
  const parsedLayout = layoutCookie ? JSON.parse(decodeURIComponent(layoutCookie)) : null;

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
      [() => layout.leftSidePanelWidth, () => layout.activePanel],
      ([leftSidePanelWidth, activePanel]) => {
        document.cookie = `layout=${encodeURIComponent(
          JSON.stringify({
            leftSidePanelWidth,
            activePanel
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
const useLayout = () => {
  return useContext(LayoutContext)!;
};

export { LayoutProvider, useLayout };
export type { ActivePanel, Layout };
