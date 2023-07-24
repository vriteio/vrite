import { useViewContext } from "./view-context";
import { Component, ComponentProps, createEffect, For, JSX, on, Show } from "solid-js";
import { marked } from "marked";
import { createStore } from "solid-js/store";
import { ExtensionSpec, ExtensionView } from "@vrite/extensions";
import { Dynamic } from "solid-js/web";
import { useExtensions } from "#context";
import { Button, IconButton, Loader, Tooltip } from "#components/primitives";
import { InputField } from "#components/fragments";

interface ComponentRendererProps {
  view: ExtensionView | string;
  spec: ExtensionSpec;
}
type RenderedComponentProps<O = Record<string, any>> = {
  slots: Record<string, JSX.Element>;
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
        {...("options" in props ? { options: props.options } : {})}
      >
        {props.slots.default}
      </InputField>
    );
  },
  Fragment: (props: RenderedComponentProps) => {
    return <>{props.slots.default}</>;
  },
  Text: (props: { value: string; class?: string }) => {
    return <span class={props.class}>{props.value}</span>;
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
        {props.slots.default}
      </Button>
    );
  },
  Tooltip: (props: RenderedComponentProps<ComponentProps<typeof Tooltip>>) => {
    return (
      <Tooltip text={props.text} side={props.side} fixed={props.fixed} class={props.class}>
        {props.slots.default}
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
  Show: (props: RenderedComponentProps<{ value: boolean }>) => {
    return (
      <Show when={props.value} fallback={props.slots.false}>
        {props.slots.true}
      </Show>
    );
  },
  View: (props: RenderedComponentProps<{ class?: string }>) => {
    return <div class={props.class}>{props.slots.default}</div>;
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
  const { callFunction } = useExtensions();
  const { context, extension } = useViewContext();

  if (typeof props.view === "string") {
    return <span innerHTML={marked.parseInline(props.view, { renderer })} />;
  }

  const shortcutProps: Record<string, string | boolean | number> = {};
  const componentName =
    (props.view.component.match(/^(.+?)(?:\[|\.|$)/)?.[1] as keyof typeof components) || "";
  const shortcutClasses = [...props.view.component.matchAll(/\.(.+?)(?=\.|\[|$)/g)].map((value) => {
    return value[1];
  });

  [...props.view.component.matchAll(/\[(.+?)=(.+?)\]/g)].forEach(([match, attribute, value]) => {
    if (!attribute.startsWith("bind:") && !attribute.startsWith("on:")) {
      shortcutProps[attribute] = value;
    }
  });
  shortcutProps.class = [...shortcutClasses, shortcutProps.class || ""].join(" ").trim();

  const [componentProps, setComponentProps] = createStore<Record<string, any>>({});
  const allProps = { ...shortcutProps, ...props.view.props };

  Object.keys(allProps).forEach((key) => {
    const value = allProps[key];

    if (key.startsWith("bind:")) {
      const bindKey = key.slice(5);
      const [group, propertyKey] = `${value}`.split(".") as ["temp", string];

      createEffect(
        on(
          () => context()[group][propertyKey],
          (value) => {
            setComponentProps(bindKey, value);
          }
        )
      );
      setComponentProps(bindKey, context()[group][propertyKey]);
      setComponentProps(`set${bindKey[0].toUpperCase()}${bindKey.slice(1)}`, () => {
        return (value: any) => {
          const setterName = `set${group[0].toUpperCase()}${group.slice(1)}` as "setTemp";

          context()[setterName](propertyKey, value);
        };
      });

      return;
    }

    if (key.startsWith("on:")) {
      const eventKey = key.slice(3);

      setComponentProps(`on${eventKey[0].toUpperCase()}${eventKey.slice(1)}`, () => {
        return () => {
          if (extension.id && extension.token) {
            callFunction(props.spec, `${value}`, {
              context,
              extensionId: extension.id,
              token: extension.token
            });
          }
        };
      });
    } else {
      setComponentProps(key, value);
    }
  });

  const children = props.view["slot:default"] || props.view["slot:"];

  return (
    <Dynamic
      component={components[componentName]}
      {...componentProps}
      slots={Object.fromEntries(
        Object.keys(props.view)
          .filter((key) => key.startsWith("slot:"))
          .map((key) => {
            const slot = (props.view as ExtensionView)[key as `slot:${string}`] as ExtensionView;

            return [
              key.slice(5) || "default",
              <For each={Array.isArray(slot) ? slot : [slot]}>
                {(view) => {
                  return <ComponentRenderer view={view} spec={props.spec} />;
                }}
              </For>
            ];
          })
      )}
    />
  );
};

export { ComponentRenderer };
