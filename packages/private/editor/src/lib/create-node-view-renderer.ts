import type { Editor, NodeViewRendererProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { NodeSelection } from "@tiptap/pm/state";
import type { NodeView, ViewMutationRecord } from "@tiptap/pm/view";
import { type Accessor, type Component, createComponent, createSignal, type Owner } from "solid-js";
import { render } from "solid-js/web";

interface UpdateAttributesOptions {
  select?: boolean;
}
interface NodeViewComponentProps<Attributes extends object = Record<string, unknown>> {
  contentDOM: HTMLElement | null;
  editable: Accessor<boolean>;
  editor: Editor;
  getPos(): number | undefined;
  node: Accessor<ProseMirrorNode>;
  selected: Accessor<boolean>;
  deleteNode(): void;
  select(): void;
  updateAttributes(attributes: Partial<Attributes>, options?: UpdateAttributesOptions): void;
}
interface NodeViewRendererConfig<Attributes extends object = Record<string, unknown>> {
  attributes?: Record<string, string>;
  class?: string;
  content?: boolean;
  contentAttributes?: Record<string, string>;
  ignoreMutation?(
    mutation: ViewMutationRecord,
    context: NodeViewComponentProps<Attributes>
  ): boolean;
  stopEvent?(event: Event, context: NodeViewComponentProps<Attributes>): boolean;
}

const setAttributes = (element: HTMLElement, attributes?: Record<string, string>): void => {
  Object.entries(attributes || {}).forEach(([name, value]) => {
    element.setAttribute(name, value);
  });
};
const createNodeViewRenderer = <Attributes extends object = Record<string, unknown>>(
  component: Component<NodeViewComponentProps<Attributes>>,
  config: NodeViewRendererConfig<Attributes> = {}
) => {
  return (owner: unknown, editable?: Accessor<boolean>) => {
    return (props: NodeViewRendererProps): NodeView => {
      const dom = document.createElement("div");
      const contentDOM = config.content ? document.createElement("div") : null;
      const [node, setNode] = createSignal(props.node);
      const [selected, setSelected] = createSignal(false);
      const getPosition = (): number | null => {
        const pos = props.getPos();

        return typeof pos === "number" ? pos : null;
      };
      const select = () => {
        if (editable && !editable()) return;

        const pos = getPosition();

        if (pos === null) return;

        props.editor.commands.setNodeSelection(pos);
      };
      const updateAttributes = (
        attributes: Partial<Attributes>,
        options?: UpdateAttributesOptions
      ) => {
        if (editable && !editable()) return;

        props.editor.commands.command(({ tr }) => {
          const pos = getPosition();

          if (pos === null) return false;

          tr.setNodeMarkup(pos, undefined, {
            ...node().attrs,
            ...attributes
          });

          if (options?.select) tr.setSelection(NodeSelection.create(tr.doc, pos));

          return true;
        });
      };
      const deleteNode = () => {
        if (editable && !editable()) return;

        props.editor.commands.command(({ tr }) => {
          const pos = getPosition();

          if (pos === null) return false;

          tr.delete(pos, pos + node().nodeSize);

          return true;
        });
      };
      const context: NodeViewComponentProps<Attributes> = {
        contentDOM,
        editable: editable || (() => props.editor.isEditable),
        editor: props.editor,
        getPos: props.getPos,
        node,
        selected,
        deleteNode,
        select,
        updateAttributes
      };
      const unmount = render(() => createComponent(component, context), dom, undefined, {
        owner: owner as Owner
      });

      if (config.class) dom.className = config.class;

      setAttributes(dom, config.attributes);

      if (contentDOM) setAttributes(contentDOM, config.contentAttributes);

      return {
        dom,
        contentDOM: contentDOM || undefined,
        ignoreMutation: config.ignoreMutation
          ? (mutation) => config.ignoreMutation!(mutation, context)
          : undefined,
        stopEvent: config.stopEvent ? (event) => config.stopEvent!(event, context) : undefined,
        selectNode() {
          if (!props.editor.view.dragging) setSelected(true);
        },
        deselectNode() {
          setSelected(false);
        },
        update(updatedNode) {
          setNode(updatedNode);

          return true;
        },
        destroy() {
          unmount();
        }
      };
    };
  };
};

export { createNodeViewRenderer };
export type { NodeViewComponentProps, NodeViewRendererConfig, UpdateAttributesOptions };
