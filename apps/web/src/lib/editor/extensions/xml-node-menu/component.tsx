import { ElementMenuEditor } from "./editor";
import { ElementSelection, isElementSelection } from "../element/selection";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Component, Show, createEffect, createSignal } from "solid-js";
import { Node as PMNode } from "@tiptap/pm/model";

interface ElementMenuState {
  pos: number;
  node: PMNode | null;
  container: HTMLElement | null;
  editor: SolidEditor;
  active: boolean;
}
interface ElementMenuProps {
  state: ElementMenuState & {
    setState(state: ElementMenuState): void;
  };
}

const ElementMenu: Component<ElementMenuProps> = (props) => {
  const [attributes, setAttributes] = createSignal({ type: "", props: {} as Record<string, any> });

  createEffect(() => {
    setAttributes((attributes) => {
      if (!props.state.node) {
        return { type: "", props: {} };
      }

      const newAttributes = props.state.node.attrs;

      if (
        newAttributes.type !== attributes.type ||
        JSON.stringify(newAttributes.props) !== JSON.stringify(attributes.props)
      ) {
        return { type: newAttributes.type, props: newAttributes.props };
      }

      return attributes;
    });
  });

  return (
    <Show when={props.state.editor.isEditable}>
      <div class="flex">
        <ElementMenuEditor
          state={{
            editor: props.state.editor,
            type: attributes()?.type || "",
            props: attributes()?.props || {},
            active: props.state.active,
            contentSize: props.state.node?.content.size || 0,

            removeElement() {
              props.state.editor.commands.command(({ tr, dispatch }) => {
                if (!dispatch) return false;

                const lastPos = props.state.pos;

                if (typeof lastPos === "number" && props.state.node) {
                  tr.delete(lastPos, lastPos + props.state.node.nodeSize);

                  return true;
                }

                return false;
              });
            },
            setElement(element) {
              props.state.editor.commands.command(({ tr, dispatch }) => {
                if (!dispatch) return false;

                const lastSelection = props.state.editor.state.selection;
                const lastPos = props.state.pos;

                if (lastPos !== null) {
                  tr.setNodeAttribute(lastPos, "type", element.type);
                  tr.setNodeAttribute(lastPos, "props", element.props);

                  if (element.content && !props.state.node?.content.size) {
                    tr.replaceWith(
                      lastPos + 1,
                      lastPos + props.state.node!.content.size + 1,
                      props.state.editor.schema.node("paragraph")
                    );
                  } else if (!element.content && props.state.node?.content.size) {
                    tr.delete(lastPos + 1, lastPos + props.state.node!.content.size + 1);
                  }

                  if (isElementSelection(lastSelection) && props.state.editor.isFocused) {
                    tr.setSelection(
                      ElementSelection.create(tr.doc, lastSelection.$from.pos, false)
                    );
                  }

                  return true;
                }

                return false;
              });
            }
          }}
          setState={(value) => {
            props.state.setState({
              ...props.state,
              ...value
            });
          }}
        />
      </div>
    </Show>
  );
};

export { ElementMenu };
