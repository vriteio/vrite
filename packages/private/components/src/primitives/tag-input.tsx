import { type Component, createSignal, Show } from "solid-js";
import { Input } from "./input";
import { TagList } from "./tag-list";

interface TagInputProps {
  values: string[];
  disabled?: boolean;
  label?: string;
  placeholder?: string;
  setValues?(values: string[]): void;
}

const TagInput: Component<TagInputProps> = (props) => {
  const [inputValue, setInputValue] = createSignal("");
  const addValue = () => {
    const value = inputValue().trim();

    if (!value || props.values.includes(value)) {
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
        disabled={props.disabled}
        setValue={setInputValue}
        onKeyDown={(event) => event.stopPropagation()}
        onEnter={(event) => {
          event.preventDefault();
          addValue();
        }}
        onBlur={addValue}
      />
      <Show when={Boolean(props.values.length)}>
        <TagList values={props.values} disabled={props.disabled} setValues={props.setValues} />
      </Show>
    </div>
  );
};

export { TagInput };
