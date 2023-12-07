import { CodeBlockAttributes } from "./node";
import { SolidNodeViewProps } from "@vrite/tiptap-solid";
import { mdiCodeTags, mdiCodeTagsCheck, mdiFileOutline } from "@mdi/js";
import { Component, createEffect, createMemo, createSignal, on, Show } from "solid-js";
import { debounce } from "@solid-primitives/scheduled";
import { Card, IconButton, Input, Tooltip } from "#components/primitives";
import { useSuggestLanguage, isFormattable } from "#lib/code-editor";
import { createRef } from "#lib/utils";

interface CodeBlockMenuProps {
  state: SolidNodeViewProps<CodeBlockAttributes>;
  changeLanguage(lang: string | null): void;
  format(): void;
}

const CodeBlockMenu: Component<CodeBlockMenuProps> = (props) => {
  const [mode, setMode] = createSignal<"title" | "lang">("lang");
  const [suggestions, setSuggestions] = createSignal<string[]>([]);
  const attrs = (): CodeBlockAttributes => props.state.node.attrs;
  const suggestLanguage = useSuggestLanguage();
  const formattingAvailable = createMemo(() => isFormattable(attrs().lang?.split(" ")?.[0] || ""));
  const updateAttribute = debounce((attributes: CodeBlockAttributes) => {
    return props.state.updateAttributes(attributes);
  }, 200);
  const currentValue = (): string => {
    if (mode() === "lang") {
      return [attrs().lang, attrs().meta].filter(Boolean).join(" ");
    }

    return attrs().title || "";
  };

  createEffect(
    on(attrs, (attrs) => {
      setSuggestions(suggestLanguage(attrs.lang || ""));
      props.changeLanguage(attrs.lang?.split(" ")?.[0] || null);
    })
  );

  return (
    <div class="pointer-events-auto flex bg-gray-50 dark:bg-gray-900 !md:bg-transparent border-gray-200 dark:border-gray-700 border-y-2 md:border-0 backdrop-blur-sm md:gap-2 w-screen md:flex-1 !md:left-unset relative md:rounded-2xl">
      <Card class="flex m-0 border-0 md:border-2 p-1 md:p-0 rounded-xl overflow-hidden gap-1 md:gap-0">
        <Tooltip text="Title" class="mt-1" fixed>
          <IconButton
            path={mdiFileOutline}
            color={mode() === "title" ? "primary" : "contrast"}
            text={mode() === "title" ? "primary" : "soft"}
            variant={mode() === "title" ? "solid" : "text"}
            class="m-0"
            onClick={() => {
              setMode("title");
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip text="Language" class="mt-1" fixed>
          <IconButton
            path={mdiCodeTags}
            color={mode() === "lang" ? "primary" : "contrast"}
            text={mode() === "lang" ? "primary" : "soft"}
            variant={mode() === "lang" ? "solid" : "text"}
            class="m-0"
            onClick={() => {
              setMode("lang");
            }}
          ></IconButton>
        </Tooltip>
      </Card>
      <Card class="flex m-0 border-0 md:border-2 px-1 py-1 md:py-0 rounded-xl overflow-hidden flex-1">
        <Input
          wrapperClass="flex-1 min-w-unset w-full md:max-w-96"
          placeholder={mode() === "title" ? "Snippet title" : "Language meta"}
          value={currentValue()}
          suggestions={mode() === "lang" ? suggestions() : []}
          suggestionsBoxClass="mt-3 mx-0 mb-0"
          class="m-0 !bg-transparent text-lg"
          color="contrast"
          disabled={!props.state.editor.isEditable}
          setValue={(value) => {
            updateAttribute.clear();

            if (mode() === "lang") {
              const [lang, ...meta] = value.split(" ");

              updateAttribute({ meta: meta.join(" "), lang });
            } else {
              updateAttribute({ title: value });
            }
          }}
        />
      </Card>
      <Card class="flex m-0 border-0 md:border-2 p-1 md:p-0 rounded-xl overflow-hidden">
        <Show when={props.state.editor.isEditable}>
          <Tooltip
            text={formattingAvailable() ? "Format" : "Formatting unavailable"}
            class="mt-1"
            fixed
          >
            <IconButton
              path={mdiCodeTagsCheck}
              color="contrast"
              text="soft"
              variant="text"
              class="m-0"
              disabled={!formattingAvailable()}
              onClick={props.format}
            ></IconButton>
          </Tooltip>
        </Show>
      </Card>
    </div>
  );
};

export { CodeBlockMenu };
