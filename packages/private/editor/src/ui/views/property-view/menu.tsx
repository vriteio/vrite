import { DropdownMenu, Input, TagInput, Tooltip, type MenuItem } from "@andesine/components";
import type { Editor } from "@tiptap/core";
import clsx from "clsx";
import { createEffect, createSignal, onCleanup, onMount, Show, type JSX } from "solid-js";
import { getResourceNameDetails } from "#editor/extensions/resource-name-tracker";
import { MAX_PROPERTY_NAME_LENGTH } from "#editor/schema";

interface PropertyAttrs {
  type: "text" | "number" | "checkbox" | "date" | "url" | "select" | "multi-select";
  label: string;
  value: string | boolean | string[];
  options: string[];
  inherited?: boolean;
  schemaFieldID?: string | null;
  sourceCollectionID?: string | null;
}
interface PropertyMenuProps {
  attrs: PropertyAttrs;
  editor: Editor;
  getPos(): number | undefined;
  selected: boolean;
  deleteProperty(): void;
  selectProperty(): void;
  updateAttributes(attributes: Partial<PropertyAttrs>): void;
}

const propertyTypeDetails = {
  "text": { icon: "i-lucide:text", label: "Text", value: "" },
  "number": { icon: "i-lucide:hash", label: "Number", value: "" },
  "checkbox": { icon: "i-lucide:toggle-right", label: "Checkbox", value: false },
  "date": { icon: "i-lucide:calendar", label: "Date", value: "" },
  "url": { icon: "i-lucide:link", label: "URL", value: "" },
  "select": { icon: "i-lucide:circle-chevron-down", label: "Select", value: "" },
  "multi-select": { icon: "i-lucide:list-collapse", label: "Multi-select", value: [] }
} satisfies Record<
  PropertyAttrs["type"],
  { icon: string; label: string; value: PropertyAttrs["value"] }
>;

const PropertyMenu = (props: PropertyMenuProps): JSX.Element => {
  const [opened, setOpened] = createSignal(false);
  const [label, setLabel] = createSignal(props.attrs.label);
  const [options, setOptions] = createSignal(props.attrs.options);
  const [nameInputTabIndex, setNameInputTabIndex] = createSignal(0);
  const propertyNameDetails = () => {
    return getResourceNameDetails(props.editor.state, "property", props.getPos(), label());
  };
  const blurInputOnEscape = (event: KeyboardEvent) => {
    const target = event.target;
    const propertyMenuInput =
      target instanceof HTMLInputElement && target.closest("[data-property-menu-input]");

    if (event.key !== "Escape" || !propertyMenuInput) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    target.blur();
  };
  const commitConfiguration = () => {
    const attributes: Partial<PropertyAttrs> = { label: label() };
    const currentOptions = options();
    const currentValue = props.attrs.value;

    if (["select", "multi-select"].includes(props.attrs.type)) {
      attributes.options = currentOptions;

      if (props.attrs.type === "select" && typeof currentValue === "string") {
        attributes.value = currentOptions.includes(currentValue) ? currentValue : "";
      }

      if (props.attrs.type === "multi-select" && Array.isArray(currentValue)) {
        attributes.value = currentValue.filter((value) => currentOptions.includes(value));
      }
    }

    props.updateAttributes(attributes);
  };
  const setType = (type: PropertyAttrs["type"]) => {
    commitConfiguration();
    props.updateAttributes({ type, value: propertyTypeDetails[type].value });
  };
  const typeItem = (type: PropertyAttrs["type"]): MenuItem => ({
    icon: propertyTypeDetails[type].icon,
    label: propertyTypeDetails[type].label,
    selected: props.attrs.type === type,
    closeOnSelect: false,
    onClick: () => setType(type)
  });
  const menuItems = (): Array<Array<MenuItem | (() => JSX.Element)>> => {
    const configurationItems: Array<(() => JSX.Element)[]> = [
      [
        () => (
          <div class="flex w-full min-w-0 flex-col gap-1 p-1 md:min-w-60" data-property-menu-input>
            <Input
              class="w-full min-w-0 bg-gray-50"
              label="Property name"
              size="small"
              color="contrast"
              variant="outlined"
              placeholder="Property"
              maxLength={MAX_PROPERTY_NAME_LENGTH}
              tabIndex={nameInputTabIndex()}
              value={label()}
              setValue={setLabel}
              slot={() => (
                <Show when={propertyNameDetails().warning} keyed>
                  {(warning) => (
                    <div class="absolute right-2">
                      <Tooltip
                        content={
                          <span class="max-w-48 whitespace-pre-wrap leading-tight">{warning}</span>
                        }
                      >
                        <div class="i-lucide:triangle-alert h-4 w-4 bg-gradient-to-tr" />
                      </Tooltip>
                    </div>
                  )}
                </Show>
              )}
              onConfirm={commitConfiguration}
              onFocus={() => setNameInputTabIndex(-1)}
              onKeyDown={(event) => event.stopPropagation()}
            />
            <p class="text-xs text-gray-400">
              Available via the API as{" "}
              <span class="bg-gray-950/2.5 rounded-md py-0.5 px-1">
                <code class="font-mono text-gray-500 bg-gradient-to-tr text-transparent bg-clip-text">
                  {propertyNameDetails().name}
                </code>
              </span>
            </p>
          </div>
        )
      ]
    ];

    if (["select", "multi-select"].includes(props.attrs.type)) {
      configurationItems.push([
        () => (
          <div class="w-full min-w-0 max-w-none p-1 md:max-w-60" data-property-menu-input>
            <TagInput
              label="Options"
              placeholder="Add option"
              values={options()}
              setValues={setOptions}
            />
          </div>
        )
      ]);
    }

    return [
      ...configurationItems,
      [
        {
          icon: propertyTypeDetails[props.attrs.type].icon,
          label: "Type",
          items: [
            typeItem("text"),
            typeItem("number"),
            typeItem("checkbox"),
            typeItem("date"),
            typeItem("url"),
            typeItem("select"),
            typeItem("multi-select")
          ]
        }
      ],
      [
        {
          icon: "i-lucide:trash-2",
          label: "Delete property",
          color: "danger",
          onClick: props.deleteProperty
        }
      ]
    ];
  };

  createEffect(() => {
    if (!opened()) {
      setLabel(props.attrs.label);
      setOptions(props.attrs.options);
    }
  });
  onMount(() => {
    document.addEventListener("keydown", blurInputOnEscape, true);
  });
  onCleanup(() => {
    document.removeEventListener("keydown", blurInputOnEscape, true);
  });

  return (
    <DropdownMenu
      title="Property settings"
      opened={opened()}
      setOpened={(nextOpened) => {
        if (!opened() && nextOpened) setNameInputTabIndex(0);

        if (opened() && !nextOpened) commitConfiguration();

        setOpened(nextOpened);
      }}
      trigger={() => (
        <button
          type="button"
          class="relative flex my-1 h-7 md:my-0 md:h-9 w-full min-w-0 cursor-pointer items-center gap-1 text-sm font-medium md:min-w-48"
          aria-label="Configure property"
          data-block-control-anchor
          onClick={props.selectProperty}
        >
          <Show when={props.selected}>
            <div class="absolute inset-y-0 -left-2.5 -z-10 w-[calc(100%+1.25rem)] bg-gradient-to-r from-secondary via-primary to-transparent opacity-10 md:-left-2 md:w-[calc(100%+0.75rem)] md:rounded-lg" />
          </Show>
          <div
            data-node-selection-icon
            class={clsx(
              "h-4.5 w-4.5 shrink-0",
              propertyTypeDetails[props.attrs.type].icon,
              props.selected ? "bg-gradient-to-tr" : "text-gray-300"
            )}
          />
          <span
            data-node-selection-label
            class={clsx(
              "min-w-0 truncate text-start",
              props.selected ? "bg-gradient-to-tr bg-clip-text text-transparent" : "text-gray-500"
            )}
          >
            {props.attrs.label || "Property"}
          </span>
          <span
            data-node-selection-line
            class={clsx(
              "ml-1 h-px flex-1 rounded-full md:hidden",
              props.selected
                ? "bg-gradient-to-r from-secondary via-primary to-transparent"
                : "bg-gray-200"
            )}
          />
        </button>
      )}
      placement="bottom-start"
      portal={false}
      positioningStrategy="absolute"
      cardProps={{ class: "w-full max-w-none not-prose md:max-w-64" }}
      items={menuItems()}
    />
  );
};

export { PropertyMenu, propertyTypeDetails };
export type { PropertyAttrs };
