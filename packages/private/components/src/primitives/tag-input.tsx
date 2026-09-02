import { type Component, createSignal, Show } from "solid-js";
import { Input } from "./input";
import { TagList } from "./tag-list";
import { Tooltip } from "./tooltip";

interface TagInputProps {
  values: string[];
  commitOnEnter?: boolean;
  disabled?: boolean;
  disableAutoFocus?: boolean;
  label?: string;
  maxLength?: number;
  maxValues?: number;
  placeholder?: string;
  validate?(values: string[]): string | undefined;
  setValues?(values: string[]): void;
}

const TagInput: Component<TagInputProps> = (props) => {
  const [inputValue, setInputValue] = createSignal("");
  const [touched, setTouched] = createSignal(false);
  const error = () => (touched() ? props.validate?.(props.values) : undefined);
  const maxValuesReached = () => {
    return typeof props.maxValues === "number" && props.values.length >= props.maxValues;
  };
  const setValues = (values: string[]) => {
    setTouched(true);
    props.setValues?.(values);
  };
  const addValue = () => {
    const value = inputValue().trim();

    setTouched(true);

    if (!value || props.values.includes(value) || maxValuesReached()) {
      setInputValue("");
      return;
    }

    props.setValues?.([...props.values, value]);
    setInputValue("");
  };

  return (
    <div class=":base: flex w-full min-w-0 flex-col gap-1">
      <Input
        class=":base-2: w-full min-w-0 bg-gray-50"
        label={props.label}
        size="small"
        color="contrast"
        variant="outlined"
        placeholder={props.placeholder}
        value={inputValue()}
        disabled={props.disabled || maxValuesReached()}
        maxLength={props.maxLength}
        data-no-autofocus={props.disableAutoFocus ? "" : undefined}
        setValue={setInputValue}
        onKeyDown={(event) => event.stopPropagation()}
        onEnter={(event) => {
          const input = event.currentTarget;

          event.preventDefault();

          if (props.commitOnEnter === false && input instanceof HTMLInputElement) {
            input.blur();
            return;
          }

          addValue();
        }}
        onBlur={addValue}
        aria-invalid={Boolean(error())}
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
      <Show when={Boolean(props.values.length)}>
        <TagList values={props.values} disabled={props.disabled} setValues={setValues} />
      </Show>
    </div>
  );
};

export { TagInput };
