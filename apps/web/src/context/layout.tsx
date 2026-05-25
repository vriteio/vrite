import { createAsync, query } from "@solidjs/router";
import { createContext, ParentComponent, createEffect, useContext, on } from "solid-js";
import { createStore, SetStoreFunction } from "solid-js/store";
import { getRequestEvent } from "solid-js/web";
import { getCookie } from "vinxi/http";

interface Layout {
  leftSidePanelWidth: number;
  rightSidePanelWidth: number;
}

const loadLayout = query(async () => {
  "use server";
  const event = getRequestEvent();
  const layoutCookie = event ? getCookie(event.nativeEvent, "layout") : "";
  const layout: Layout = layoutCookie
    ? JSON.parse(layoutCookie)
    : {
        leftSidePanelWidth: 0,
        rightSidePanelWidth: 0
      };
  return layout;
}, "layout");
const LayoutContext = createContext<{
  layout: Layout;
  setLayout: SetStoreFunction<Layout>;
}>();
const LayoutProvider: ParentComponent = (props) => {
  const initialLayout = createAsync(() => loadLayout(), { deferStream: true });
  const [layout, setLayout] = createStore<Layout>({
    leftSidePanelWidth: 0,
    rightSidePanelWidth: 0
  });

  setLayout({ ...initialLayout() });
  createEffect(
    on(
      [() => layout.leftSidePanelWidth, () => layout.rightSidePanelWidth],
      ([leftSidePanelWidth, rightSidePanelWidth]) => {
        document.cookie = `layout=${JSON.stringify({
          leftSidePanelWidth,
          rightSidePanelWidth
        })}`;
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
