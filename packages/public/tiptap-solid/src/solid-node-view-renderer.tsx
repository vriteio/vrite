import { SolidNodeViewContext, SolidNodeViewProps } from "./use-solid-node-view";
import { SolidEditor } from "./editor";
import { SolidRenderer } from "./solid-renderer";
import { Decoration, DecorationSource, NodeView as ProseMirrorNodeView } from "@tiptap/pm/view";
import {
  DecorationWithType,
  NodeView,
  NodeViewRenderer,
  NodeViewRendererOptions,
  NodeViewRendererProps
} from "@tiptap/core";
import { Component, createMemo } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Node as ProseMirrorNode } from "@tiptap/pm/model";

interface SolidNodeViewRendererOptions extends NodeViewRendererOptions {
  update:
    | ((props: {
        oldNode: ProseMirrorNode;
        oldDecorations: readonly Decoration[];
        oldInnerDecorations: DecorationSource;
        newNode: ProseMirrorNode;
        newDecorations: readonly Decoration[];
        innerDecorations: DecorationSource;
        updateProps: () => void;
      }) => boolean)
    | null;
}

class SolidNodeView extends NodeView<Component, SolidEditor, SolidNodeViewRendererOptions> {
  declare public contentDOMElement: HTMLElement | null;

  declare public renderer: SolidRenderer;

  public get dom(): HTMLElement {
    const portalContainer = this.renderer.element.firstElementChild;

    if (portalContainer && !portalContainer.hasAttribute("data-node-view-wrapper")) {
      throw new Error("Please use the NodeViewWrapper component for your node view.");
    }

    return this.renderer.element as HTMLElement;
  }

  public get contentDOM(): HTMLElement | null {
    if (this.node.isLeaf) {
      return null;
    }

    return this.contentDOMElement;
  }

  public mount(): void {
    const state: SolidNodeViewProps = {
      editor: this.editor,
      node: this.node,
      decorations: this.decorations as DecorationWithType[],
      innerDecorations: this.innerDecorations,
      selected: false,
      extension: this.extension,
      view: this.view,
      HTMLAttributes: this.HTMLAttributes,
      getPos: () => this.getPos(),
      updateAttributes: (attributes = {}) => this.updateAttributes(attributes),
      deleteNode: () => this.deleteNode()
    };
    const SolidNodeViewProvider: Component<{ state: SolidNodeViewProps }> = (props) => {
      const component = createMemo(() => this.component);
      const nodeViewContentRef = (element: Element) => {
        if (element && this.contentDOMElement && !element.contains(this.contentDOMElement)) {
          element.append(this.contentDOMElement);
        }
      };
      const context = {
        nodeViewContentRef,
        state: createMemo(() => ({
          onDragStart: this.onDragStart.bind(this),
          ...props.state
        }))
      };

      return (
        <SolidNodeViewContext.Provider value={context}>
          <Dynamic component={component()} />
        </SolidNodeViewContext.Provider>
      );
    };

    if (this.node.isLeaf) {
      this.contentDOMElement = null;
    } else {
      this.contentDOMElement = document.createElement(this.node.isInline ? "span" : "div");
    }

    if (this.contentDOMElement) {
      this.contentDOMElement.style.whiteSpace = "pre-wrap";
    }

    this.renderer = new SolidRenderer(SolidNodeViewProvider, {
      editor: this.editor,
      state,
      as: this.node.isInline ? "span" : "div"
    });
  }

  public update(
    node: ProseMirrorNode,
    decorations: readonly DecorationWithType[],
    innerDecorations: DecorationSource
  ): boolean {
    if (node.type !== this.node.type) {
      console.warn("Node type mismatch, cannot update node view");
      return false;
    }

    if (typeof this.options.update === "function") {
      const oldNode = this.node;
      const oldDecorations = this.decorations;
      const oldInnerDecorations = this.innerDecorations;

      this.node = node;
      this.decorations = decorations;
      this.innerDecorations = innerDecorations;

      return this.options.update({
        oldNode,
        oldDecorations,
        newNode: node,
        newDecorations: decorations,
        oldInnerDecorations,
        innerDecorations,
        updateProps: () => this.updateProps({ node, decorations, innerDecorations })
      });
    }

    if (
      node === this.node &&
      this.decorations === decorations &&
      this.innerDecorations === innerDecorations
    ) {
      return true;
    }

    this.node = node;
    this.decorations = decorations;
    this.innerDecorations = innerDecorations;
    this.updateProps({ node, decorations, innerDecorations });

    return true;
  }

  public selectNode(): void {
    this.renderer.setState?.((state) => ({ ...state, selected: true }));
  }

  public deselectNode(): void {
    this.renderer.setState?.((state) => ({ ...state, selected: false }));
  }

  public destroy(): void {
    this.renderer.destroy();
    this.contentDOMElement = null;
  }

  private updateProps(props: Partial<SolidNodeViewProps>): void {
    this.renderer.setState?.((state) => ({ ...state, ...props }));
  }
}

const SolidNodeViewRenderer = (
  component: Component,
  options?: Partial<SolidNodeViewRendererOptions>
): NodeViewRenderer => {
  return (props: NodeViewRendererProps) => {
    const { renderers, setRenderers } = props.editor as SolidEditor;

    if (!renderers || !setRenderers) {
      return {} as unknown as ProseMirrorNodeView;
    }

    return new SolidNodeView(component, props, options) as unknown as ProseMirrorNodeView;
  };
};

export { SolidNodeViewRenderer };
export type { SolidNodeViewRendererOptions };
