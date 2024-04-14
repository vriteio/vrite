import { NodeViewRendererProps } from "@tiptap/core";
import { Node as PMNode } from "@tiptap/pm/model";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { ExtensionElementViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import { useNotifications } from "#context";
import { ExtensionDetails, ExtensionViewRenderer } from "#lib/extensions";

const customSubTrees = new Map<string, Promise<ExtensionElement | null>>();
const customNodeView = ({
  props,
  editor,
  extension,
  uid,
  view,
  contentWrapper,
  wrapper,
  updateProps,
  getProps
}: {
  props: NodeViewRendererProps;
  editor: SolidEditor;
  uid: string;
  view: ExtensionElement;
  extension: ExtensionDetails;
  contentWrapper: HTMLElement;
  wrapper: HTMLElement;
  updateProps(newProps: Record<string, any>): void;
  getProps(): Record<string, any>;
  getSelected(): boolean;
}): Partial<PMNodeView> => {
  let node = props.node as PMNode;

  const component = new SolidRenderer(
    (props: {
      state: {
        editor: SolidEditor;
        pos: number;
        node: PMNode;
      };
    }) => {
      const { notify } = useNotifications();

      return (
        <ExtensionViewRenderer<ExtensionElementViewContext>
          view={view}
          extension={extension}
          contentEditable={false}
          ctx={{
            contextFunctions: ["notify"],
            usableEnv: { readable: [], writable: ["props"] },
            config: extension.config || {}
          }}
          func={{
            notify
          }}
          uid={uid}
          usableEnvData={{
            props: getProps()
          }}
          onUsableEnvDataUpdate={(data) => {
            if (data.props) {
              updateProps(data.props);
            }
          }}
          onInitiated={(view) => {
            setTimeout(() => {
              component.element.querySelector("[data-content=true]")?.append(contentWrapper);
            }, 500);
          }}
        />
      );
    },
    {
      editor,
      state: {
        node,
        editor: props.editor as SolidEditor,
        pos: typeof props.getPos === "function" ? props.getPos() : 0
      }
    }
  );

  wrapper.setAttribute("class", "!m-0");
  wrapper.setAttribute("data-uid", uid);
  wrapper.setAttribute("data-initialized", "true");
  contentWrapper.setAttribute("class", "content relative");
  wrapper.append(component.element);

  return {
    update(newNode) {
      if (newNode.type.name !== "element") return false;

      node = newNode;
      component.setState((state) => ({
        ...state,
        node,
        pos: typeof props.getPos === "function" ? props.getPos() : 0
      }));

      return true;
    }
  };
};

export { customNodeView, customSubTrees };
