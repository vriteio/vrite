import { Input, Tooltip } from "@andesine/components";
import { normalizeResourceName } from "@andesine/editor/normalize-resource-name";
import { type Component, createEffect, createSignal, Show } from "solid-js";

interface FilterInputProps {
  disableAutoFocus?: boolean;
  label: string;
  value: string;
  maxLength?: number;
  placeholder?: string;
  type?: "number" | "text";
  validate?(value: string): string | undefined;
  setValue(value: string): void;
}
interface PropertyFilterNameProps {
  name: string;
  setName(name: string, key: string): void;
}

const FilterInput: Component<FilterInputProps> = (props) => {
  const [value, setValue] = createSignal(props.value);
  const [touched, setTouched] = createSignal(false);
  const error = () => (touched() ? props.validate?.(value()) : undefined);
  const commit = () => {
    setTouched(true);
    props.setValue(value());
  };

  createEffect(() => setValue(props.value));

  return (
    <Input
      class="w-full min-w-0 bg-gray-50"
      label={props.label}
      type={props.type}
      value={value()}
      setValue={setValue}
      placeholder={props.placeholder}
      variant="outlined"
      color="contrast"
      size="small"
      maxLength={props.maxLength}
      data-no-autofocus={props.disableAutoFocus ? "" : undefined}
      aria-invalid={Boolean(error())}
      onConfirm={commit}
      onKeyDown={(event) => event.stopPropagation()}
      slot={() => (
        <Show when={error()} keyed>
          {(error) => (
            <div class="absolute right-2">
              <Tooltip
                content={<span class="max-w-48 whitespace-pre-wrap leading-tight">{error}</span>}
              >
                <div class="h-4 w-4 bg-gradient-to-tr i-lucide:triangle-alert" />
              </Tooltip>
            </div>
          )}
        </Show>
      )}
    />
  );
};
const PropertyFilterName: Component<PropertyFilterNameProps> = (props) => {
  return (
    <div class="flex w-full min-w-0 flex-col gap-1 p-1 md:min-w-60">
      <FilterInput
        disableAutoFocus
        label="Property name"
        value={props.name}
        setValue={(name) => props.setName(name, normalizeResourceName(name, "property"))}
        placeholder="Status"
        maxLength={100}
        validate={(value) => (!value.trim() ? "Enter a property name." : undefined)}
      />
    </div>
  );
};

export { FilterInput, PropertyFilterName };
