import { DropdownArea } from "@andesine/components";
import { type Component, Show } from "solid-js";
import {
  createNodeViewRenderer,
  type NodeViewComponentProps,
  type UpdateAttributesOptions
} from "#editor/lib";
import { PropertyMenu, propertyTypeDetails, type PropertyAttrs } from "./menu";
import { PropertyValue } from "./value";
import { InheritedSchemaFieldBadge } from "../inherited-schema-field-badge";
import clsx from "clsx";

interface PropertyViewProps extends NodeViewComponentProps<PropertyAttrs> {
  schemaMode: boolean;
}

const PropertyView: Component<PropertyViewProps> = (props) => {
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
  const readonlyValue = () => {
    const value = attrs().value;

    if (Array.isArray(value)) return value.join(", ") || "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";

    return value || "—";
  };
  const editable = () => props.editable() && !attrs().inherited;
  const configurable = () => props.schemaMode || !attrs().schemaFieldID;

  return (
    <Show
      when={editable()}
      fallback={
        <div
          class="relative flex min-h-9 w-full select-none flex-col items-start md:flex-row md:gap-4"
          data-inherited-schema-field={attrs().inherited ? "" : undefined}
          contentEditable={false}
          aria-readonly={attrs().inherited ? "true" : undefined}
        >
          <Show when={attrs().inherited}>
            <InheritedSchemaFieldBadge />
          </Show>
          <div class="flex h-9 w-full min-w-0 items-center gap-1 text-sm font-medium md:w-48">
            <div class={`h-4.5 w-4.5 shrink-0 text-gray-300 ${propertyTypeDetails[type()].icon}`} />
            <span class="min-w-0 truncate text-gray-500">{attrs().label || "Property"}</span>
          </div>
          <div class="flex min-h-9 min-w-0 flex-1 items-center text-sm text-gray-700">
            {readonlyValue()}
          </div>
        </div>
      }
    >
      <div class="flex min-h-9 w-full flex-col items-start md:flex-row md:gap-4">
        <div class="w-full md:w-auto">
          <Show
            when={configurable()}
            fallback={
              <div class="flex h-9 w-full min-w-0 items-center gap-1 text-sm font-medium md:w-48">
                <div
                  class={`h-4.5 w-4.5 shrink-0 text-gray-300 ${propertyTypeDetails[type()].icon}`}
                />
                <span class="min-w-0 truncate text-gray-500">{attrs().label || "Property"}</span>
              </div>
            }
          >
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
          </Show>
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
            defaultValue={props.schemaMode}
            selected={props.selected()}
            selectProperty={props.select}
            updateAttributes={updateAttributes}
          />
        </div>
      </div>
    </Show>
  );
};
const createPropertyViewRenderer = (
  owner: unknown,
  editable: () => boolean,
  schemaMode = false
) => {
  const Renderer: Component<NodeViewComponentProps<PropertyAttrs>> = (props) => (
    <PropertyView {...props} schemaMode={schemaMode} />
  );

  return createNodeViewRenderer(Renderer, {
    class: "ProseMirror-widget",
    attributes: {
      "data-node-view-wrapper": "true",
      "data-property-node-view": ""
    },
    ignoreMutation(mutation) {
      if (mutation.type === "selection") return false;

      return true;
    },
    stopEvent(event, context) {
      if (context.node().attrs.inherited) return true;

      return !(event instanceof DragEvent);
    }
  })(owner, editable);
};

export { createPropertyViewRenderer };
