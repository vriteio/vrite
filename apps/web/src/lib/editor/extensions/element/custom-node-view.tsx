import { NodeViewRendererProps } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { ExtensionElementViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import clsx from "clsx";
import { useNotifications } from "#context";
import { ExtensionDetails, ExtensionViewRenderer } from "#lib/extensions";

const customSubTrees = new Map<string, Promise<ExtensionElement | null>>();
const customNodeView = ({
  props,
  editor,
  extension,
  uid,
  view,
  top,
  contentWrapper,
  wrapper,
  updateProps,
  getProps
}: {
  props: NodeViewRendererProps;
  editor: SolidEditor;
  uid: string;
  view: ExtensionElement;
  top?: boolean;
  extension: ExtensionDetails;
  contentWrapper: HTMLElement;
  wrapper: HTMLElement;
  updateProps(newProps: Record<string, any>): void;
  getProps(): Record<string, any>;
}): Partial<PMNodeView> => {
  const component = new SolidRenderer(
    () => {
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
        />
      );
    },
    {
      editor,
      state: {}
    }
  );
  const contentWrapperParent = component.element.querySelector("[data-content=true]");

  contentWrapperParent?.append(contentWrapper);
  contentWrapper.setAttribute(
    "class",
    clsx(":base: relative", "content", contentWrapperParent?.getAttribute("data-class"))
  );
  wrapper.setAttribute("class", "!m-0");
  wrapper.setAttribute("data-uid", uid);
  wrapper.setAttribute("data-initialized", "true");
  wrapper.append(component.element);

  if (top) {
    wrapper.setAttribute("data-custom-node-view", "true");
  }

  return {};
};

export { customNodeView, customSubTrees };
