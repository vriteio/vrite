import {
  Checkbox,
  Combobox,
  DatePicker,
  Dropdown,
  IconButton,
  Input,
  Select,
  TagList
} from "@andesine/components";
import clsx from "clsx";
import { createMediaQuery } from "@solid-primitives/media";
import { createEffect, createSignal, Match, Switch, type JSX } from "solid-js";
import type { UpdateAttributesOptions } from "#editor/lib";
import type { PropertyAttrs } from "./menu";
import { PlainTextInput } from "./plain-text-input";

interface PropertyValueProps {
  attrs: PropertyAttrs;
  selected: boolean;
  selectProperty(): void;
  updateAttributes(attributes: Partial<PropertyAttrs>, options?: UpdateAttributesOptions): void;
}

const RESTING_INPUT_OVERRIDES =
  "!bg-transparent !outline-transparent !shadow-none media-mouse:hover:!bg-white media-mouse:hover:!outline-gray-200 media-mouse:hover:!shadow-md focus:!bg-gray-100 focus:!outline-gray-200 focus:!shadow-md";
const RESTING_CONTROL_OVERRIDES =
  "!border-transparent !bg-transparent !shadow-none media-mouse:hover:!border-gray-200 media-mouse:hover:!bg-gray-100 media-mouse:hover:!shadow-md focus-visible:!border-gray-200 focus-visible:!bg-gray-100 focus-visible:!shadow-md data-[state=open]:!border-gray-200 data-[state=open]:!bg-gray-100 data-[state=open]:!shadow-md";

const PropertyValue = (props: PropertyValueProps): JSX.Element => {
  const [inputValue, setInputValue] = createSignal("");
  const [multiSelectOptionsPlacement, setMultiSelectOptionsPlacement] = createSignal<
    "bottom" | "top"
  >("bottom");
  const md = createMediaQuery("(min-width: 768px)");
  const stringValue = (): string => {
    const value = props.attrs.value;

    return typeof value === "string" ? value : "";
  };
  const multiSelectValues = (): string[] => {
    const value = props.attrs.value;

    return Array.isArray(value) ? value : [];
  };
  const availableMultiSelectOptions = () => {
    const values = multiSelectValues();

    return props.attrs.options
      .filter((option) => !values.includes(option))
      .map((option) => ({ label: option, value: option }));
  };
  const addMultiSelectValue = (value: string) => {
    if (multiSelectValues().includes(value)) return;

    props.updateAttributes({ value: [...multiSelectValues(), value] });
  };
  const toggleCheckbox = (event: MouseEvent) => {
    event.preventDefault();
    props.updateAttributes({ value: props.attrs.value !== true }, { select: true });
  };
  const updateMultiSelectOptionsPlacement = (placement: string) => {
    setMultiSelectOptionsPlacement(placement.startsWith("top") ? "top" : "bottom");
  };
  const commitInputValue = () => props.updateAttributes({ value: inputValue() });

  createEffect(() => {
    setInputValue(stringValue());
  });

  return (
    <Switch>
      <Match when={props.attrs.type === "text"}>
        <PlainTextInput
          class={!props.selected ? RESTING_INPUT_OVERRIDES : undefined}
          value={stringValue()}
          onConfirm={(value) => props.updateAttributes({ value })}
        />
      </Match>
      <Match when={props.attrs.type === "number"}>
        <Input
          type="number"
          variant="outlined"
          color="contrast"
          size="small"
          placeholder="Enter number"
          class={clsx("w-full min-w-0", !props.selected && RESTING_INPUT_OVERRIDES)}
          value={inputValue()}
          setValue={setInputValue}
          onConfirm={commitInputValue}
        />
      </Match>
      <Match when={props.attrs.type === "checkbox"}>
        <div
          class="group/property-value relative flex items-center w-full cursor-pointer rounded-lg px-1.5 py-1.25 focus-visible:outline-none"
          data-property-checkbox-value
          onClick={toggleCheckbox}
          onPointerDown={(event) => {
            event.preventDefault();
            props.selectProperty();
          }}
        >
          <div class="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 opacity-0 transition-opacity media-mouse:group-hover/property-value:opacity-100" />
          <span class="relative z-1">
            <Checkbox
              size="small"
              checked={props.attrs.value === true}
              setChecked={(value) => props.updateAttributes({ value }, { select: true })}
            />
          </span>
        </div>
      </Match>
      <Match when={props.attrs.type === "date"}>
        <DatePicker
          class="w-full"
          showCalendarIcon={false}
          triggerClass={!props.selected ? RESTING_CONTROL_OVERRIDES : undefined}
          value={stringValue()}
          setValue={(value) => props.updateAttributes({ value })}
        />
      </Match>
      <Match when={props.attrs.type === "url"}>
        <Input
          type="url"
          variant="outlined"
          color="contrast"
          size="small"
          placeholder="https://example.com"
          class={clsx("w-full min-w-0", !props.selected && RESTING_INPUT_OVERRIDES)}
          value={inputValue()}
          setValue={setInputValue}
          onConfirm={commitInputValue}
        />
      </Match>
      <Match when={props.attrs.type === "select"}>
        <Select
          class="w-full"
          triggerClass={!props.selected ? RESTING_CONTROL_OVERRIDES : undefined}
          title="Select property value"
          placeholder="Select"
          options={props.attrs.options.map((option) => ({ label: option, value: option }))}
          portal={false}
          positioningStrategy="absolute"
          value={stringValue()}
          setValue={(value) => props.updateAttributes({ value })}
        />
      </Match>
      <Match when={props.attrs.type === "multi-select"}>
        <div class="flex w-full min-w-0 flex-col gap-2">
          <Dropdown
            class="w-full"
            offset={{ mainAxis: 2, crossAxis: 7 }}
            placement="bottom-start"
            onPlacementChange={updateMultiSelectOptionsPlacement}
            portal={false}
            positioningStrategy="absolute"
            sameWidth
            cardProps={{
              class:
                "w-full md:w-[calc(100%-0.875rem)] md:border-0 md:!bg-transparent md:p-0 md:!shadow-none md:[&>div]:overflow-visible"
            }}
            trigger={(dropdown) => (
              <div
                role="button"
                tabindex="0"
                class="group/property-value relative flex w-full min-w-0 cursor-pointer items-start gap-1 rounded-lg py-1.25 px-1.5 focus-visible:bg-gray-100 focus-visible:outline-none"
                onClick={props.selectProperty}
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault();
                    props.selectProperty();
                  }
                }}
              >
                <span
                  class={clsx(
                    "pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-gray-100 opacity-0 transition-opacity",
                    !dropdown.opened && "media-mouse:group-hover/property-value:opacity-100"
                  )}
                />
                <TagList
                  class="relative z-1 flex-1"
                  values={multiSelectValues()}
                  setValues={(value) => props.updateAttributes({ value })}
                >
                  <IconButton
                    class={clsx(
                      "shrink-0",
                      multiSelectValues().length > 0 ? "p-0.75" : "py-0.5 px-0.75"
                    )}
                    icon="i-lucide:plus"
                    iconProps={{ class: "h-4.5 w-4.5" }}
                    label={
                      multiSelectValues().length > 0
                        ? undefined
                        : () => <span class="px-0.5 text-sm">Add value</span>
                    }
                    size="small"
                    text="soft"
                    variant="outlined"
                    color="contrast"
                  />
                </TagList>
              </div>
            )}
          >
            <div class="flex w-full min-w-0 flex-col gap-2 px-1 pb-1.5 md:px-0 md:pb-0">
              <div class="flex w-full min-w-0 flex-col md:hidden">
                <span class="mb-1 text-xs leading-[1] text-gray-400">
                  {props.attrs.label || "Property"}
                </span>
                <TagList
                  values={multiSelectValues()}
                  setValues={(value) => props.updateAttributes({ value })}
                />
              </div>
              <Combobox
                class="w-full min-w-0 md:[&>label]:hidden"
                inlineOptions
                label="Add value"
                options={availableMultiSelectOptions()}
                optionsPlacement={md() ? multiSelectOptionsPlacement() : "bottom"}
                placeholder="Select value"
                portal={false}
                surfaceClass="!bg-gray-50 md:!bg-white"
                setValue={addMultiSelectValue}
              />
            </div>
          </Dropdown>
        </div>
      </Match>
    </Switch>
  );
};

export { PropertyValue };
