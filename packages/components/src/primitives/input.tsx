import { Button } from "./button";
import { Card } from "./card";
import { createRef, Ref } from "../ref";
import clsx from "clsx";
import {
  Component,
  createEffect,
  createSignal,
  For,
  JSX,
  onMount,
  Show,
  splitProps
} from "solid-js";
import { Dynamic } from "solid-js/web";
import { computePosition, flip, hide, size } from "@floating-ui/dom";

const inputColors = {
  base: `:base: border-gray-300 bg-gray-200 dark:bg-gray-900 dark:border-gray-700`,
  contrast: `:base: border-gray-300 bg-gray-200 dark:bg-gray-800 dark:border-gray-700`
};

interface InputProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
  class?: string;
  value: string;
  wrapperClass?: string;
  suggestions?: string[];
  textarea?: boolean;
  autoResize?: boolean;
  ref?: Ref<HTMLInputElement>[1];
  color?: keyof typeof inputColors;
  adornment?(): JSX.Element;
  setValue?(value: string): void;
  onEnter?(event: KeyboardEvent): void;
}

const Input: Component<InputProps> = (props) => {
  const [, passedProps] = splitProps(props, [
    "class",
    "children",
    "value",
    "setValue",
    "adornment",
    "wrapperClass",
    "color"
  ]);
  const [triggerRef, setTriggerRef] = createRef<HTMLElement | null>(null);
  const [boxRef, setBoxRef] = createSignal<HTMLElement | null>();
  const [suggestions, setSuggestions] = createSignal<string[]>([]);
  const [focused, setFocused] = createSignal(false);
  const repositionSuggestionBox = (): void => {
    const trigger = triggerRef();
    const box = boxRef();

    if (trigger && box) {
      computePosition(trigger, box, {
        middleware: [
          hide(),
          flip(),
          size({
            padding: 16,
            apply({ availableWidth, availableHeight, elements }) {
              Object.assign(elements.floating.style, {
                maxWidth: `${availableWidth}px`,
                maxHeight: `${availableHeight}px`
              });
            }
          })
        ],
        placement: "bottom"
      }).then(({ y }) => {
        box.style.top = `${y}px`;
      });
    }
  };
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  const upHandler = (): void => {
    setSelectedIndex(
      (selectedIndex() + (props.suggestions || []).length - 1) % (props.suggestions || []).length
    );
  };
  const downHandler = (): void => {
    setSelectedIndex((selectedIndex() + 1) % (props.suggestions || []).length);
  };
  const enterHandler = (): void => {
    props.setValue?.(suggestions()[selectedIndex()]);
    setSuggestions([]);
    setFocused(false);
    triggerRef()?.blur();
  };
  const onKeyUp = (event: KeyboardEvent): boolean => {
    if (event.key === "ArrowUp") {
      upHandler();

      return true;
    }

    if (event.key === "ArrowDown") {
      downHandler();

      return true;
    }

    if (event.key === "Enter") {
      enterHandler();

      return true;
    }

    if (event.key === "Escape") {
      setSuggestions([]);

      return true;
    }

    return false;
  };

  onMount(() => {
    repositionSuggestionBox();
  });
  createEffect(() => {
    repositionSuggestionBox();
    setSuggestions(props.suggestions?.filter((suggestion) => suggestion !== props.value) || []);
  });

  return (
    <div class={clsx("flex items-center relative", props.wrapperClass)}>
      <Dynamic
        ref={(element: HTMLInputElement) => {
          props.ref?.(element);
          setTriggerRef(element);
        }}
        component={props.textarea ? "textarea" : "input"}
        {...passedProps}
        class={clsx(
          `:base: flex items-center justify-start flex-1 p-2 m-1 rounded-lg ring-offset-1 focus:outline-none focus:border-primary placeholder:text-gray-400`,
          props.textarea ? ":base: min-h-16" : ":base: h-8",
          inputColors[props.color || "base"],
          props.class
        )}
        value={props.value}
        onKeyUp={(event: KeyboardEvent) => {
          if (event.key === "Enter") {
            props.onEnter?.(event);
          }

          if (event && props.suggestions) {
            onKeyUp(event);
          }
        }}
        onFocus={(
          event: FocusEvent & {
            currentTarget: HTMLInputElement;
            target: HTMLInputElement;
          }
        ) => {
          setFocused(true);

          if (typeof props.onFocus === "function") {
            props.onFocus(event);
          }
        }}
        onBlur={(
          event: FocusEvent & {
            currentTarget: HTMLInputElement;
            target: HTMLInputElement;
          }
        ) => {
          const element = event.relatedTarget as HTMLElement;

          if (!boxRef()?.contains(element || null)) {
            setFocused(false);
          }

          if (typeof props.onBlur === "function") {
            props.onBlur(event);
          }
        }}
        onInput={(
          event: InputEvent & {
            currentTarget: HTMLInputElement;
            target: HTMLInputElement;
          }
        ) => {
          if (typeof props.onInput === "function") {
            props.onInput?.(event);
          }

          if (props.autoResize) {
            event.currentTarget.style.height = "0px";
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
          }

          props.setValue?.(event.currentTarget.value);
        }}
      />
      <Show when={props.adornment} keyed>
        {(adornment) => <Dynamic component={adornment} />}
      </Show>
      <Show when={suggestions().length > 0 && focused()}>
        <Card
          class={clsx(
            `:base-2: absolute z-50 flex flex-col p-1 overflow-hidden transition-all duration-300 transform shadow-2xl w-full`
          )}
          ref={setBoxRef}
        >
          <div class="flex flex-col w-full h-full overflow-auto scrollbar-sm">
            <For each={suggestions()}>
              {(suggestion, index) => {
                return (
                  <Button
                    variant="text"
                    text="soft"
                    class={clsx(
                      "text-start",
                      selectedIndex() === index() && "bg-gray-300 dark:bg-gray-700"
                    )}
                    onClick={enterHandler}
                    hover={false}
                    onMouseEnter={() => {
                      setSelectedIndex(index());
                    }}
                  >
                    {suggestion}
                  </Button>
                );
              }}
            </For>
          </div>
        </Card>
      </Show>
    </div>
  );
};

export { Input };
