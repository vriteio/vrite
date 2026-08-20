import { DropdownArea } from "@andesine/components";
import type { Component } from "solid-js";
import { createNodeViewRenderer, type NodeViewComponentProps } from "#editor/lib";
import { FragmentMenu } from "./menu";

interface FragmentAttrs {
  name: string;
}
const FragmentView: Component<NodeViewComponentProps<FragmentAttrs>> = (props) => {
  const attrs = () => props.node().attrs as FragmentAttrs;
  const updateName = (name: string) => props.updateAttributes({ name });

  return (
    <>
      <DropdownArea>
        <FragmentMenu
          editor={props.editor}
          getPos={props.getPos}
          name={attrs().name}
          selected={props.selected()}
          selectFragment={props.select}
          updateName={updateName}
        />
      </DropdownArea>
      <div
        ref={(element) => {
          if (props.contentDOM) element.appendChild(props.contentDOM);
        }}
        class="contents"
      />
    </>
  );
};
const createFragmentViewRenderer = createNodeViewRenderer(FragmentView, {
  content: true,
  attributes: {
    "data-node-view": "true",
    "data-fragment-node-view": ""
  },
  contentAttributes: {
    "data-node-view-content": "true"
  },
  ignoreMutation(mutation, context) {
    return !context.contentDOM?.contains(mutation.target);
  },
  stopEvent(event, context) {
    if (event instanceof DragEvent) return false;

    return !context.contentDOM?.contains(event.target as globalThis.Node);
  }
});

export { createFragmentViewRenderer };
