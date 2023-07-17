import { CodeBlockAttributes } from "./node";
import { useSolidNodeView } from "@vrite/tiptap-solid";
import { mdiCodeTagsCheck } from "@mdi/js";
import { Component, createEffect, createMemo, createSignal, on, Show } from "solid-js";
import type { monaco } from "#lib/monaco";
import { IconButton, Input, Tooltip } from "#components/primitives";
import { useSuggestLanguage, isFormattable } from "#lib/code-editor";

interface CodeBlockMenuProps {
  monaco: typeof monaco;
  format(): void;
  changeLanguage(languageId: string | null): void;
}

const CodeBlockMenu: Component<CodeBlockMenuProps> = (props) => {
  const { state } = useSolidNodeView();
  const attrs = (): CodeBlockAttributes => state().node.attrs;
  const [suggestions, setSuggestions] = createSignal<string[]>([]);
  const suggestLanguage = useSuggestLanguage(props.monaco.languages.getLanguages());
  const formattingAvailable = createMemo(() => {
    return isFormattable(attrs().lang || "");
  });

  createEffect(
    on(attrs, () => {
      setSuggestions(suggestLanguage(attrs().lang || ""));
      props.changeLanguage(attrs().lang || null);
    })
  );

  return (
    <div class="flex p-0 transition-shadow duration-200 border-0 rounded-xl">
      <Input
        wrapperClass="flex-1 max-w-full"
        placeholder="Language"
        value={attrs().lang || ""}
        suggestions={suggestions()}
        color="contrast"
        disabled={!state().editor.isEditable}
        setValue={(value) => {
          state().updateAttributes({ lang: value });
        }}
      />
      <Show when={state().editor.isEditable}>
        <Tooltip text={formattingAvailable() ? "Format" : "Formatting unavailable"}>
          <IconButton
            path={mdiCodeTagsCheck}
            color="contrast"
            text="soft"
            disabled={!formattingAvailable()}
            onClick={props.format}
          ></IconButton>
        </Tooltip>
      </Show>
    </div>
  );
};

export { CodeBlockMenu };
