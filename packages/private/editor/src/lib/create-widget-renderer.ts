import {
  createWidgetDecoration,
  type Editor,
  type WidgetDecoration,
  type WidgetDecorationOptions,
  type WidgetRenderer
} from "@tiptap/core";
import { type Component, createComponent, createSignal, type Owner } from "solid-js";
import { render } from "solid-js/web";

interface WidgetComponentProps {
  editor: Editor;
  getPos(): number | undefined;
}
interface WidgetRendererConfig<Props extends object> extends WidgetDecorationOptions {
  class?: string;
  editor: Editor;
  key: string;
  owner: unknown;
  pos: number;
  props: Props;
  tag?: keyof HTMLElementTagNameMap;
}
interface SolidWidgetRenderer extends WidgetRenderer {
  element: HTMLElement;
}

const SOLID_WIDGET_CACHE = Symbol("solidWidgetCache");
const createReactiveProps = <Props extends object>(initialProps: Props) => {
  const [props, setProps] = createSignal(initialProps);
  const reactiveProps = new Proxy({} as Props, {
    get: (_, property) => props()[property as keyof Props],
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
    has: (_, property) => property in props(),
    ownKeys: () => Reflect.ownKeys(props())
  });

  return { props: reactiveProps, setProps };
};
const createWidgetRenderer = <Props extends object>(
  component: Component<Props & WidgetComponentProps>,
  config: WidgetRendererConfig<Props>
): WidgetDecoration => {
  const {
    class: className,
    editor,
    key,
    owner,
    pos,
    props,
    tag = "span",
    ...widgetOptions
  } = config;

  return createWidgetDecoration<SolidWidgetRenderer>({
    ...widgetOptions,
    cacheKey: SOLID_WIDGET_CACHE,
    editor,
    key,
    pos,
    props,
    context: (getPos) => ({ editor, getPos }),
    create: (renderProps) => {
      const element = document.createElement(tag);
      const reactiveProps = createReactiveProps(renderProps as Props & WidgetComponentProps);
      const destroy = render(
        () => createComponent(component, reactiveProps.props),
        element,
        undefined,
        {
          owner: owner as Owner
        }
      );

      element.contentEditable = "false";

      if (className) element.className = className;

      return {
        destroy,
        element,
        updateProps(updatedProps) {
          reactiveProps.setProps(() => updatedProps as Props & WidgetComponentProps);
        }
      };
    },
    materialize: (renderer) => renderer.element
  });
};

export { createWidgetRenderer };
export type { WidgetComponentProps, WidgetRendererConfig };
