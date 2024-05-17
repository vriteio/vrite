import { NodeViewRendererProps } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { ExtensionElementViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import { NodeView as PMNodeView } from "@tiptap/pm/view";
import clsx from "clsx";
import { render } from "solid-js/web";
import { mdiCursorText, mdiFormatParagraph, mdiPlus } from "@mdi/js";
import { TextSelection } from "@tiptap/pm/state";
import { useNotifications } from "#context";
import { ExtensionDetails, ExtensionViewRenderer } from "#lib/extensions";
import { IconButton } from "#components/primitives";

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
  wrapper.setAttribute("class", "!m-0 rounded-2xl");
  wrapper.setAttribute("data-uid", uid);
  wrapper.setAttribute("data-initialized", "true");
  wrapper.append(component.element);

  const pos = typeof props.getPos === "function" ? props.getPos() : null;
  const { node } = props;

  if (typeof pos === "number" && pos <= editor.view.state.doc.nodeSize) {
    const res = editor.commands.command(({ tr, dispatch }) => {
      if (!dispatch) return false;

      if (typeof pos !== "number" || pos > editor.view.state.doc.nodeSize) {
        return false;
      }

      if (node && node.type.name === "element") {
        tr.setMeta("addToHistory", false)
          .setMeta("customView", true)
          .setNodeMarkup(pos, node.type, {
            ...node.attrs,
            _: { uid }
          });
      }

      return true;
    });
  }

  if (top) {
    wrapper.setAttribute("data-custom-node-view", "true");
  }

  if (!node.content.size && contentWrapperParent) {
    const button = document.createElement("div");

    button.setAttribute("contentEditable", "false");
    button.setAttribute("class", "min-h-[35px] flex items-center");
    render(
      () => (
        <IconButton
          path={mdiPlus}
          label="Add content"
          class="m-0 pr-1"
          text="soft"
          variant="text"
          size="small"
          onPointerDown={(event) => {
            editor
              .chain()
              .command(({ tr }) => {
                if (typeof props.getPos !== "function") return false;

                const lastPos = props.getPos();

                tr.replaceWith(
                  lastPos + 1,
                  lastPos + 1,
                  editor.schema.node("paragraph")
                ).setSelection(TextSelection.create(tr.doc, lastPos + 1));

                return true;
              })
              .focus()
              .run();
            event.preventDefault();
            event.stopPropagation();
          }}
        />
      ),
      button
    );
    contentWrapperParent.append(button);
  }

  return {
    selectNode() {
      wrapper.classList.add("ring", "ring-primary", "ring-2");
    },
    deselectNode() {
      wrapper.classList.remove("ring", "ring-primary", "ring-2");
    }
  };
};

export { customNodeView, customSubTrees };
