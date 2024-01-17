import { Switch, Match, JSX, Show, Component } from "solid-js";
import clsx from "clsx";
import { Input, Select, Checkbox, Heading } from "#components/primitives";

type InputFieldType = "text" | "select" | "checkbox";
type SettingFieldValue = {
  text: string;
  select: string;
  checkbox: boolean;
};
type InputFieldValueSetter<T extends InputFieldType> = (value: SettingFieldValue[T]) => void;
type SettingFieldOptions = {
  text: {
    optional?: boolean;
    textarea?: boolean;
    placeholder?: string;
    color?: "base" | "contrast";
    disabled?: boolean;
    class?: string;
    inputProps?: Omit<JSX.InputHTMLAttributes<HTMLInputElement>, "ref">;
    adornment?: () => JSX.Element;
  };
  select: {
    optional?: boolean;
    options: Array<{ label: string; value: string }>;
    placeholder?: string;
    color?: "base" | "contrast";
    disabled?: boolean;
  };
  checkbox: {
    disabled?: boolean;
  };
};
type InputFieldProps<T extends InputFieldType> = {
  type: T;
  label: JSX.Element;
  value: SettingFieldValue[T];
  children?: JSX.Element;
  setValue: InputFieldValueSetter<T>;
} & SettingFieldOptions[T];

const TextField: Component<InputFieldProps<"text">> = (props) => {
  return (
    <>
      <Heading level={3}>
        {props.label}
        {props.optional && <span class="text-sm opacity-50"> (optional)</span>}
      </Heading>
      <Show when={props.children}>
        <p class="prose text-gray-500 dark:text-gray-400">{props.children}</p>
      </Show>
      <Input
        {...(props.inputProps || {})}
        placeholder={props.placeholder}
        color={props.color}
        textarea={props.textarea}
        autoResize={props.textarea}
        wrapperClass={props.class}
        value={props.value}
        setValue={props.setValue}
        disabled={props.disabled}
        adornment={props.adornment}
        class="m-0"
      />
    </>
  );
};
const SelectField: Component<InputFieldProps<"select">> = (props) => {
  return (
    <>
      <Heading level={3}>
        {props.label}
        {props.optional && <span class="text-sm opacity-50"> (optional)</span>}
      </Heading>
      <Show when={props.children}>
        <p class="prose text-gray-500 dark:text-gray-400">{props.children}</p>
      </Show>
      <Select
        placeholder={props.placeholder}
        color={props.color}
        wrapperClass="w-full"
        class="w-full m-0"
        setValue={props.setValue}
        value={props.value}
        options={props.options}
        disabled={props.disabled}
      />
    </>
  );
};
const CheckboxField: Component<InputFieldProps<"checkbox">> = (props) => {
  return (
    <div class="flex gap-1">
      <Checkbox checked={props.value} setChecked={props.setValue} disabled={props.disabled} />
      <p class="prose">
        <b>{props.label}</b>
        <Show when={props.children}>
          <span class="text-gray-500 dark:text-gray-400">
            {" - "}
            {props.children}
          </span>
        </Show>
      </p>
    </div>
  );
};
const InputField = <T extends InputFieldType>(props: InputFieldProps<T>): JSX.Element => {
  return (
    <div class="flex flex-col gap-1 w-full">
      <Switch>
        <Match when={props.type === "text"} keyed>
          <TextField {...(props as unknown as InputFieldProps<"text">)} />
        </Match>
        <Match when={props.type === "select"} keyed>
          <SelectField {...(props as unknown as InputFieldProps<"select">)} />
        </Match>
        <Match when={props.type === "checkbox"} keyed>
          <CheckboxField {...(props as unknown as InputFieldProps<"checkbox">)} />
        </Match>
      </Switch>
    </div>
  );
};

export { InputField };
export type { InputFieldProps };
