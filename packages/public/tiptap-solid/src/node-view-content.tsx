import { Ref } from "./ref";
import { Component, Context, JSX, splitProps, useContext } from "solid-js";
import { Dynamic } from "solid-js/web";
import { SolidNodeViewContext } from "./use-solid-node-view";

interface NodeViewContentProps {
  [key: string]: unknown;
  style?: JSX.CSSProperties;
  ref?: Ref<Element>;
  as?: string | Component<Record<string, unknown>>;
}

const NodeViewContent: Component<NodeViewContentProps> = (providedProps) => {
  const [props, passedProps] = splitProps(providedProps, ["ref", "as", "style"]);
  const { nodeViewContentRef } = useContext(
    SolidNodeViewContext as Context<{ nodeViewContentRef(element: Element): void }>
  );

  return (
    <Dynamic
      {...passedProps}
      component={props.as || "div"}
      data-node-view-content=""
      style={{
        ...props.style,
        whiteSpace: "pre-wrap"
      }}
      ref={(element: Element) => {
        nodeViewContentRef(element);
        if (props.ref) {
          props.ref[1]?.(element);
        }
      }}
    />
  );
};

export { NodeViewContent };
export type { NodeViewContentProps };
