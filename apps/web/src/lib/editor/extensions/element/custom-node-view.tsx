import { ElementDisplay } from "./view-manager";
import { isElementSelection } from "./selection";
import { NodeViewRendererProps } from "@tiptap/core";
import { SolidEditor, SolidRenderer } from "@vrite/tiptap-solid";
import { ExtensionElementViewContext, ExtensionElement } from "@vrite/sdk/extensions";
import clsx from "clsx";
import { render } from "solid-js/web";
import { mdiPlus } from "@mdi/js";
import { Node as PMNode } from "@tiptap/pm/model";
import { TextSelection } from "@tiptap/pm/state";
import { useNotifications } from "#context";
import { ExtensionDetails, ExtensionViewRenderer } from "#lib/extensions";
import { IconButton } from "#components/primitives";

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
}): ElementDisplay => {
  let node = props.node as PMNode;

  const renderer = new SolidRenderer(
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
    { editor, state: props }
  );
  const contentHole = renderer.element.querySelector("[data-content=true]");

  contentHole?.append(contentWrapper);
  wrapper.append(renderer.element);
  wrapper.setAttribute("data-custom-view", "true");
  wrapper.setAttribute("class", "!m-0 rounded-2xl");
  contentWrapper.setAttribute(
    "class",
    clsx(":base: relative", "content", contentHole?.getAttribute("data-class"))
  );

  if (!node.content.size && contentHole) {
    const buttonContainer = document.createElement("div");

    buttonContainer.setAttribute("contentEditable", "false");
    buttonContainer.setAttribute("class", "min-h-[35px] flex items-center");
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

                buttonContainer.remove();
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
      buttonContainer
    );
    contentHole.append(buttonContainer);
  }

  const { selection } = editor.state;
  const selectionPos = selection.$from.pos;
  const pos = typeof props.getPos === "function" ? props.getPos() : null;

  if (pos === selectionPos && isElementSelection(selection)) {
    wrapper.classList.add("ring", "ring-primary", "ring-2");
  }

  return {
    onSelect() {
      wrapper.classList.add("ring", "ring-primary", "ring-2");
    },
    onDeselect() {
      wrapper.classList.remove("ring", "ring-primary", "ring-2");
    },
    onUpdate(newNode) {
      if (newNode.type.name !== "element") return false;

      node = newNode;
    },
    unmount() {
      wrapper.removeAttribute("class");
      wrapper.removeAttribute("data-custom-view");
      contentWrapper.removeAttribute("class");
      contentHole?.removeChild(contentWrapper);
      renderer.destroy();
    }
  };
};

export { customNodeView };
