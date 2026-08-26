import { DropdownArea } from "@andesine/components";
import { type Component, Show } from "solid-js";
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
      <Show
        when={props.editable()}
        fallback={
          <div class="flex h-9 w-full items-center gap-2 text-sm font-medium">
            <span class="i-lucide:letter-text h-4.5 w-4.5 shrink-0 text-gray-300" />
            <span class="min-w-0 truncate text-gray-500">{attrs().name || "Content"}</span>
            <span class="h-px flex-1 rounded-full bg-gray-200" />
          </div>
        }
      >
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
      </Show>
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
