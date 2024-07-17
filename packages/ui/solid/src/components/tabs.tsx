import {
  Accessor,
  Component,
  JSX,
  ParentComponent,
  Setter,
  Show,
  createContext,
  createEffect,
  createSignal,
  on,
  splitProps,
  useContext
} from "solid-js";
import { Dynamic, Portal } from "solid-js/web";
import { nanoid } from "nanoid";

interface TabsContextData {
  activeTab: Accessor<string>;
  tabPanel: Accessor<HTMLElement | undefined>;
  setTabPanel: Setter<HTMLElement | undefined>;
  setActiveTab: Setter<string>;
}
interface TabListProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?: keyof JSX.IntrinsicElements | ParentComponent;
}
interface TabPanelProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | Component<{
        ref(tabPanel: HTMLElement): void;
      }>;
}
interface TabProps extends Omit<JSX.HTMLAttributes<HTMLElement>, "children" | "ref"> {
  as?:
    | keyof JSX.IntrinsicElements
    | ParentComponent<{
        onClick(event: MouseEvent & { currentTarget: HTMLElement; target: Element }): void;
      }>;
  label: JSX.Element | Component<{ active: boolean }>;
  value?: string;
}
interface TabRootProps {
  value?: string;
  setValue(value: string): void;
}

const TabsContext = createContext<TabsContextData>();
const useTabsContext = (): TabsContextData => {
  return useContext(TabsContext)!;
};
const TabList: ParentComponent<TabListProps> = (props) => {
  const [, passProps] = splitProps(props, ["as", "children"]);

  return (
    <Dynamic {...passProps} component={props.as || "div"} role="tablist">
      {props.children}
    </Dynamic>
  );
};
const TabPanel: Component<TabPanelProps> = (props) => {
  const { setTabPanel } = useTabsContext();
  const [, passProps] = splitProps(props, ["as"]);

  return (
    <Dynamic
      {...passProps}
      component={props.as || "div"}
      role="tabpanel"
      ref={(tabPanel: HTMLElement) => setTabPanel(tabPanel)}
    />
  );
};
const Tab: ParentComponent<TabProps> = (props) => {
  const { tabPanel, activeTab, setActiveTab } = useTabsContext();
  const [, passProps] = splitProps(props, ["label", "value", "as", "children"]);
  const id = nanoid();
  const value = (): string => props.value || id;
  const active = (): boolean => value() === activeTab();

  setActiveTab((activeTab) => (activeTab === "" ? value() : activeTab));

  return (
    <>
      <Dynamic
        {...passProps}
        component={props.as || "button"}
        role="tab"
        onClick={() => {
          setActiveTab(value());
        }}
      >
        <Show when={typeof props.label === "function"} fallback={props.label as JSX.Element}>
          <Dynamic component={props.label as Component<{ active: boolean }>} active={active()} />
        </Show>
      </Dynamic>
      <Show when={active()}>
        <Portal mount={tabPanel()}>{props.children}</Portal>
      </Show>
    </>
  );
};
const TabsRoot: ParentComponent<TabRootProps> = (props) => {
  const [activeTab, setActiveTab] = createSignal(props.value || "");
  const [tabPanel, setTabPanel] = createSignal<HTMLElement | undefined>();

  createEffect(() => {
    setActiveTab(props.value || "");
  });
  createEffect(() => {
    props.setValue?.(activeTab());
  });

  return (
    <TabsContext.Provider
      value={{
        tabPanel,
        activeTab,
        setActiveTab,
        setTabPanel
      }}
    >
      {props.children}
    </TabsContext.Provider>
  );
};
const Tabs = {
  Root: TabsRoot,
  Tab,
  List: TabList,
  Panel: TabPanel
};

export { Tabs };
