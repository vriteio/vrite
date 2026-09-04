import { DropdownArea } from "@andesine/components";
import { type Component, Show } from "solid-js";
import { createNodeViewRenderer, type NodeViewComponentProps } from "#editor/lib";
import { InheritedSchemaFieldBadge } from "../inherited-schema-field-badge";
import { FragmentMenu, type FragmentAttrs } from "./menu";

interface FragmentViewProps extends NodeViewComponentProps<FragmentAttrs> {
  schemaMode: boolean;
}
const FragmentView: Component<FragmentViewProps> = (props) => {
  const attrs = () => props.node().attrs as FragmentAttrs;
  const editable = () => {
    return props.editable() && !attrs().inherited && (props.schemaMode || !attrs().schemaFieldID);
  };

  return (
    <div
      class={attrs().inherited ? "relative select-none" : "relative"}
      data-inherited-schema-field={attrs().inherited ? "" : undefined}
      aria-readonly={attrs().inherited ? "true" : undefined}
    >
      <Show when={attrs().inherited}>
        <InheritedSchemaFieldBadge />
      </Show>
      <Show
        when={editable()}
        fallback={
          <div
            class="flex h-9 w-full items-center gap-2 text-sm font-medium"
            data-fragment-header
            contentEditable={false}
          >
            <span class="i-lucide:letter-text h-4.5 w-4.5 shrink-0 text-gray-300" />
            <span class="min-w-0 truncate text-gray-500">{attrs().name || "Content"}</span>
            <span class="h-px flex-1 rounded-full bg-gray-200" />
          </div>
        }
      >
        <DropdownArea>
          <FragmentMenu
            attrs={attrs()}
            editor={props.editor}
            getPos={props.getPos}
            schemaMode={props.schemaMode}
            selected={props.selected()}
            selectFragment={props.select}
            updateAttributes={props.updateAttributes}
          />
        </DropdownArea>
      </Show>
      <div
        ref={(element) => {
          if (props.contentDOM) element.appendChild(props.contentDOM);
        }}
        class="contents"
        contentEditable={attrs().inherited ? false : undefined}
      />
    </div>
  );
};
const createFragmentViewRenderer = (
  owner: unknown,
  editable: () => boolean,
  schemaMode = false
) => {
  const Renderer: Component<NodeViewComponentProps<FragmentAttrs>> = (props) => (
    <FragmentView {...props} schemaMode={schemaMode} />
  );

  return createNodeViewRenderer(Renderer, {
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
      if (context.node().attrs.inherited) return true;
      if (event instanceof DragEvent) return false;

      return !context.contentDOM?.contains(event.target as globalThis.Node);
    }
  })(owner, editable);
};

export { createFragmentViewRenderer };
