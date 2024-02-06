import { useViewContext } from "./extension-view-renderer";
import {
  Component,
  ComponentProps,
  createEffect,
  For,
  JSX,
  Match,
  on,
  Show,
  Switch
} from "solid-js";
import { marked } from "marked";
import { createStore } from "solid-js/store";
import { ExtensionElement, ExtensionSpec } from "@vrite/sdk/extensions";
import { Dynamic } from "solid-js/web";
import { useNotifications } from "#context";
import { Button, IconButton, Loader, Tooltip } from "#components/primitives";
import { InputField } from "#components/fragments";
import { ContextObject } from "#collections";

interface ComponentRendererProps {
  view: ExtensionElement | string;
  spec: ExtensionSpec;
}
type RenderedComponentProps<O = Record<string, any>> = {
  children: JSX.Element;
} & O;

const components = {
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
        {...("options" in props ? { options: props.options } : {})}
      >
        {props.children}
      </InputField>
    );
  },
  Text: (props: { content: string; class?: string }) => {
    return <span class={props.class}>{props.content}</span>;
  },
  Button: (props: RenderedComponentProps<ComponentProps<typeof Button>>) => {
    return (
      <Button
        variant={props.variant}
        color={props.color}
        onClick={props.onClick}
        class={props.class}
        text={props.text}
        disabled={"disabled" in props ? props.disabled : false}
        loading={"loading" in props ? props.loading : false}
      >
        {props.children}
      </Button>
    );
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
      />
    );
  },
  Loader,
  Show: (props: RenderedComponentProps<{ when: boolean }>) => {
    return <Show when={props.when}>{props.children}</Show>;
  },
  Switch: (props: RenderedComponentProps) => {
    return <Switch>{props.children}</Switch>;
  },
  Match: (props: RenderedComponentProps<{ when: boolean }>) => {
    return <Match when={props.when}>{props.children}</Match>;
  },
  View: (props: RenderedComponentProps<{ class?: string }>) => {
    return <div class={props.class}>{props.children}</div>;
  },
  Fragment: (props: RenderedComponentProps) => {
    return <>{props.children}</>;
  }
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
  const { envData, setEnvData, extension } = useViewContext();
  const { sandbox } = extension;

  if (typeof props.view === "string") {
    return <span innerHTML={marked.parseInline(props.view, { renderer }) as string} />;
  }

  const componentName =
    (props.view.component.match(/^(.+?)(?:\[|\.|$)/)?.[1] as keyof typeof components) || "";
  const [componentProps, setComponentProps] = createStore<Record<string, any>>({});
  const viewProps = props.view.props || {};

  Object.keys(viewProps).forEach((key) => {
    const value = viewProps[key];

    if (key.startsWith("bind:")) {
      const bindKey = key.slice(5);
      const pathParts = `${value}`.split(".");

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
          setEnvData((currentValue) => {
            const newValue = { ...(currentValue as ContextObject) };

            let currentObject = newValue;

            pathParts.forEach((part, index) => {
              if (index === pathParts.length - 1) {
                currentObject[part] = value;
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
              usableEnv: { readable: [], writable: [] },
              config: {}
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
    <Dynamic component={components[componentName]} {...componentProps}>
      <For each={Array.isArray(props.view.slot) ? props.view.slot : [props.view.slot]}>
        {(view) => {
          return <ComponentRenderer view={view} spec={props.spec} />;
        }}
      </For>
    </Dynamic>
  );
};

export { ComponentRenderer };
