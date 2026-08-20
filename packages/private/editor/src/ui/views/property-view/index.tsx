import { DropdownArea } from "@andesine/components";
import type { Component } from "solid-js";
import {
  createNodeViewRenderer,
  type NodeViewComponentProps,
  type UpdateAttributesOptions
} from "#editor/lib";
import { PropertyMenu, type PropertyAttrs } from "./menu";
import { PropertyValue } from "./value";
import clsx from "clsx";

const PropertyView: Component<NodeViewComponentProps<PropertyAttrs>> = (props) => {
  const attrs = (): PropertyAttrs => {
    return props.node().attrs as PropertyAttrs;
  };
  const updateAttributes = (
    attributes: Partial<PropertyAttrs>,
    options?: UpdateAttributesOptions
  ) => {
    props.updateAttributes({ ...attrs(), ...attributes }, options);
  };
  const type = () => attrs().type;
  const isInput = () => ["text", "number", "checkbox"].includes(type());
  const isMultiSelect = () => type() === "multi-select";
  const selectOnFocus = (event: FocusEvent) => {
    const target = event.target;

    if (target instanceof Element && target.closest("[data-property-checkbox-value]")) return;

    props.select();
  };

  return (
    <div class="flex flex-col md:flex-row md:gap-4 items-start w-full min-h-9">
      <div class="w-full md:w-auto">
        <DropdownArea>
          <PropertyMenu
            attrs={attrs()}
            editor={props.editor}
            getPos={props.getPos}
            selected={props.selected()}
            selectProperty={props.select}
            updateAttributes={updateAttributes}
            deleteProperty={props.deleteNode}
          />
        </DropdownArea>
      </div>
      <div
        class={clsx("h-full flex items-center min-h-9 w-full min-w-0 flex-1", {
          "py-1": isInput(),
          "py-0.5": !isInput() && !isMultiSelect()
        })}
        onFocusIn={selectOnFocus}
      >
        <PropertyValue
          attrs={attrs()}
          selected={props.selected()}
          selectProperty={props.select}
          updateAttributes={updateAttributes}
        />
      </div>
    </div>
  );
};
const createPropertyViewRenderer = createNodeViewRenderer(PropertyView, {
  class: "ProseMirror-widget",
  attributes: {
    "data-node-view-wrapper": "true",
    "data-property-node-view": ""
  },
  ignoreMutation(mutation) {
    if (mutation.type === "selection") return false;

    return true;
  },
  stopEvent(event) {
    return !(event instanceof DragEvent);
  }
});

export { createPropertyViewRenderer };
