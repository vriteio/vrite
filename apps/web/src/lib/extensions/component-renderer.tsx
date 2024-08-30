import { useViewContext } from "./extension-view-renderer";
import {
  Component,
  ComponentProps,
  createEffect,
  createMemo,
  For,
  JSX,
  Match,
  on,
  Show,
  splitProps,
  Switch
} from "solid-js";
import { marked } from "marked";
import { createStore } from "solid-js/store";
import { ExtensionElement, ExtensionSpec, ContextObject } from "@vrite/sdk/extensions";
import { Dynamic } from "solid-js/web";
import clsx from "clsx";
import { mdiChevronLeft, mdiClose } from "@mdi/js";
import {
  Button,
  Card,
  Heading,
  Icon,
  IconButton,
  Loader,
  Select,
  Tooltip
} from "#components/primitives";
import { CollapsibleSection, InputField } from "#components/fragments";
import { ExtensionDetails, useLocalStorage, useNotifications } from "#context";

interface ComponentRendererProps {
  view: ExtensionElement | string;
  spec: ExtensionSpec;
  contentEditable?: boolean;
  components?: Record<string, Component<any>>;
}
type SidePanelHeaderSection = {
  label: string;
  icon: string;
  id: string;
  action?: ExtensionElement;
};
type RenderedComponentProps<O = Record<string, any>> = {
  contentEditable?: boolean;
  children: JSX.Element;
  extension: ExtensionDetails;
  renderView(view: ExtensionElement): JSX.Element;
} & O;

const baseComponents = {
  SidePanelContent: (props: RenderedComponentProps) => {
    return (
      <div class="flex-col h-full relative flex overflow-hidden">
        <div class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast px-5">
          <div class="flex justify-start flex-col min-h-full items-start w-full gap-5 pb-5">
            {props.children}
          </div>
        </div>
      </div>
    );
  },
  SidePanelHeader: (
    props: RenderedComponentProps<{
      defaultSection: string;
      section: string;
      sections: SidePanelHeaderSection[];
      onBack?: () => void;
    }>
  ) => {
    const getSection = (sectionId: string): SidePanelHeaderSection => {
      return (
        props.sections.find(({ id }) => id === sectionId) ||
        props.sections[0] || {
          id: "",
          label: props.extension.spec.displayName,
          icon: undefined
        }
      );
    };
    const section = (): SidePanelHeaderSection => getSection(props.section || props.defaultSection);
    const defaultSection = (): SidePanelHeaderSection => getSection(props.defaultSection);
    const isDefaultSection = (): boolean => props.section === props.defaultSection;
    const { setStorage } = useLocalStorage();

    return (
      <div
        class={clsx(
          "flex justify-start items-start mb-4 px-5 flex-col",
          isDefaultSection() ? "pt-5" : "pt-2"
        )}
      >
        <IconButton
          variant="text"
          class={clsx("m-0 h-6 -mb-1", isDefaultSection() && "hidden")}
          onClick={() => {
            if (!isDefaultSection()) {
              props.onBack?.();
            }
          }}
          label={defaultSection().label}
          size="small"
          path={mdiChevronLeft}
        ></IconButton>
        <div class="flex justify-center items-center w-full">
          <Show
            when={isDefaultSection()}
            fallback={
              <>
                <Show when={section().icon}>
                  <IconButton
                    class="m-0 mr-1"
                    path={section().icon}
                    variant="text"
                    hover={false}
                    badge
                  />
                </Show>
                <Heading level={2} class="flex-1">
                  {section().label}
                </Heading>
              </>
            }
          >
            <IconButton
              path={mdiClose}
              text="soft"
              badge
              class="flex md:hidden mr-2 m-0"
              onClick={() => {
                setStorage((storage) => ({
                  ...storage,
                  sidePanelWidth: 0
                }));
              }}
            />
            <Heading level={1} class="py-1 flex-1">
              {section().label}
            </Heading>
          </Show>
          <Show when={section().action}>{props.renderView(section().action!)}</Show>
        </div>
      </div>
    );
  },
  Field: (props: RenderedComponentProps<ComponentProps<typeof InputField>>) => {
    return (
      <InputField
        type={props.type}
        value={props.value}
        setValue={props.setValue}
        label={props.label}
        color={"color" in props ? props.color : "base"}
        optional={"optional" in props ? props.optional : false}
        disabled={"disabled" in props ? props.disabled : false}
        textarea={"textarea" in props ? props.textarea : false}
        placeholder={"placeholder" in props ? props.placeholder : ""}
        inputProps={{
          contentEditable: props.contentEditable
        }}
        {...("options" in props ? { options: props.options } : {})}
      >
        {props.children}
      </InputField>
    );
  },
  Select: (props: RenderedComponentProps<ComponentProps<typeof Select>>) => {
    return (
      <Select
        value={props.value}
        setValue={props.setValue}
        class={props.class}
        color={props.color}
        options={props.options}
        placeholder={props.placeholder}
        wrapperClass={props.wrapperClass}
        contentEditable={props.contentEditable}
      >
        {props.children}
      </Select>
    );
  },
  Text: (props: { content: string; class?: string; contentEditable?: boolean }) => {
    return (
      <span class={props.class} contentEditable={props.contentEditable}>
        {props.content}
      </span>
    );
  },
  Button: (props: RenderedComponentProps<ComponentProps<typeof Button>>) => {
    const [, passedProps] = splitProps(props, ["children"]);

    return (
      <Button
        {...passedProps}
        disabled={"disabled" in props ? props.disabled : false}
        loading={"loading" in props ? props.loading : false}
      >
        {props.children}
      </Button>
    );
  },
  Card: (props: RenderedComponentProps<ComponentProps<typeof Card>>) => {
    return (
      <Card color={props.color} class={props.class}>
        {props.children}
      </Card>
    );
  },
  Icon: (props: RenderedComponentProps<ComponentProps<typeof Icon>>) => {
    return <Icon path={props.path} class={props.class} />;
  },
  Tooltip: (props: RenderedComponentProps<ComponentProps<typeof Tooltip>>) => {
    return (
      <Tooltip text={props.text} side={props.side} fixed={props.fixed} class={props.class}>
        {props.children}
      </Tooltip>
    );
  },
  IconButton: (props: RenderedComponentProps<ComponentProps<typeof IconButton>>) => {
    return (
      <IconButton
        variant={props.variant}
        color={props.color}
        onClick={props.onClick}
        class={props.class}
        path={props.path}
        label={props.label}
        text={props.text}
        disabled={"disabled" in props ? props.disabled : false}
        loading={"loading" in props ? props.loading : false}
        contentEditable={props.contentEditable}
      />
    );
  },
  Loader,
  Show: (props: RenderedComponentProps<{ when: boolean }>) => {
    return <Show when={props.when}>{props.children}</Show>;
  },
  CollapsibleSection: (
    props: RenderedComponentProps<{
      icon: string;
      label: string;
      action?: ExtensionElement;
      color?: "base" | "primary";
      defaultOpened?: boolean;
    }>
  ) => {
    return (
      <CollapsibleSection
        icon={props.icon}
        label={props.label}
        action={props.action ? props.renderView(props.action) : undefined}
      >
        {props.children}
      </CollapsibleSection>
    );
  },
  Switch: (props: RenderedComponentProps) => {
    return <Switch>{props.children}</Switch>;
  },
  Match: (props: RenderedComponentProps<{ when?: boolean }>) => {
    return <Match when={props.when}>{props.children}</Match>;
  },
  View: (
    props: RenderedComponentProps<{
      [dataKey: `data-${string}`]: string;
      class?: string;
    }>
  ) => {
    return <div class={props.class}>{props.children}</div>;
  },
  Fragment: (props: RenderedComponentProps) => {
    return <>{props.children}</>;
  },
  Content: (props: RenderedComponentProps<{ wrapperClass?: string; class?: string }>) => {
    return (
      <div
        data-content="true"
        data-class={props.class}
        class={clsx(":base: w-full", props.wrapperClass)}
      />
    );
  },
  Element: (props: RenderedComponentProps) => <>{props.children}</>
};
const renderer = new marked.Renderer();
const linkRenderer = renderer.link;

renderer.link = (href, title, text) => {
  const html = linkRenderer.call(renderer, href, title, text);

  if (href === text && title == null) {
    return href;
  }

  return html.replace(/^<a /, '<a target="_blank" rel="nofollow" ');
};

const ComponentRenderer: Component<ComponentRendererProps> = (props) => {
  const { notify } = useNotifications();
  const components = createMemo<Record<string, Component<any>>>(() => ({
    ...baseComponents,
    ...props.components
  }));
  const { envData, setEnvData, extension } = useViewContext();
  const { sandbox } = extension;

  if (typeof props.view === "string") {
    return (
      <span
        innerHTML={marked.parseInline(props.view, { renderer }) as string}
        contentEditable={props.contentEditable}
      />
    );
  }

  const componentName = props.view.component.match(/^(.+?)(?:\[|\.|$)/)?.[1] || "";
  const [componentProps, setComponentProps] = createStore<Record<string, any>>({});
  const viewProps = props.view.props || {};
  const renderView = (view: ExtensionElement | string): JSX.Element => {
    return (
      <ComponentRenderer
        view={view}
        spec={props.spec}
        contentEditable={props.contentEditable}
        components={props.components}
      />
    );
  };

  Object.keys(viewProps).forEach((key) => {
    const value = viewProps[key];

    if (key.startsWith("bind:")) {
      const bindKey = key.slice(5);
      const path = `${value}`;
      const pathParts = path.split(".");

      createEffect(
        on(
          () => {
            return pathParts.slice(1).reduce((acc, part) => {
              return (acc as ContextObject)?.[part];
            }, envData()[pathParts[0]]);
          },
          (value) => {
            setComponentProps(bindKey, value);
          }
        )
      );
      setComponentProps(
        bindKey,
        pathParts.slice(1).reduce((acc, part) => {
          return (acc as ContextObject)?.[part];
        }, envData()[pathParts[0]])
      );
      setComponentProps(`set${bindKey[0].toUpperCase()}${bindKey.slice(1)}`, () => {
        return (value: any) => {
          setEnvData([path], (envData) => {
            const newValue = { ...(envData as ContextObject) };

            let currentObject = newValue;

            pathParts.forEach((part, index) => {
              if (index === pathParts.length - 1) {
                currentObject[part] = value;
              } else if (index === 0) {
                currentObject[part] = { ...(currentObject[part] as ContextObject) };
                currentObject = currentObject[part] as ContextObject;
              } else {
                currentObject = currentObject[part] as ContextObject;
              }
            });

            return newValue;
          });
        };
      });

      return;
    }

    if (key.startsWith("on:")) {
      const eventKey = key.slice(3);

      setComponentProps(`on${eventKey[0].toUpperCase()}${eventKey.slice(1)}`, () => {
        return () => {
          sandbox?.runFunction(
            `${value}`,
            {
              contextFunctions: [],
              usableEnv: { readable: [], writable: [] }
            },
            { notify }
          );
        };
      });
    } else {
      setComponentProps(key, value);
    }
  });

  return (
    <Dynamic
      component={components()[componentName]}
      contentEditable={props.contentEditable}
      view={props.view}
      renderView={renderView}
      extension={extension}
      {...componentProps}
    >
      {props.view.slot?.length && (
        <For each={props.view.slot}>
          {(view) => {
            return renderView(view);
          }}
        </For>
      )}
    </Dynamic>
  );
};

export { ComponentRenderer };
