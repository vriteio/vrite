import clsx from "clsx";
import { type Component, createSignal, onMount, Show } from "solid-js";
import { Card, IconButton, Input, Tooltip, createRef } from "@andesine/components";
import { type Editor } from "@tiptap/core";
import { validateURL } from "#editor/lib";

const LinkMenu: Component<{
  class?: string;
  editor: Editor;
  setMode(mode: string): void;
}> = (props) => {
  const [url, setUrl] = createSignal("");
  const [invalid, setInvalid] = createSignal(false);
  const [inputRef, setInputRef] = createRef<HTMLInputElement | null>(null);
  const saveLink = (): void => {
    const href = validateURL(url());

    if (!href) {
      setInvalid(true);
      inputRef()?.focus();

      return;
    }

    props.editor.chain().unsetCode().setLink({ href }).focus().run();
    props.setMode("format");
  };
  const removeLink = (): void => {
    props.editor.chain().unsetLink().focus().run();
    props.setMode("format");
  };

  onMount(() => {
    const href = props.editor.getAttributes("link").href || "";

    setUrl(href);
    setTimeout(() => inputRef()?.focus(), 50);
  });

  return (
    <Card
      data-menu="link"
      class={clsx(
        "relative flex p-1 gap-1 rounded-xl items-center not-prose bg-white",
        props.class
      )}
      shade
    >
      <IconButton
        icon="i-lucide:arrow-left"
        variant="text"
        size="xs"
        onClick={(event) => {
          props.setMode("format");
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <Input
        ref={setInputRef}
        value={url()}
        setValue={(value) => {
          setUrl(value);
          setInvalid(false);
        }}
        placeholder="Enter URL..."
        onEnter={saveLink}
        class={clsx("py-0 my-0 flex-1 min-w-40", invalid() && "outline-red-400")}
        aria-invalid={invalid()}
        variant="outlined"
        color="contrast"
        size="xs"
      />
      <Show when={invalid()}>
        <Tooltip content="Invalid URL. Only HTTP, HTTPS, and mailto links are allowed.">
          <div class="i-lucide:triangle-alert h-4 w-4 text-red-500" />
        </Tooltip>
      </Show>
      <IconButton
        icon="i-lucide:check"
        variant="text"
        size="xs"
        onClick={(event) => {
          saveLink();
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <IconButton
        icon="i-lucide:trash-2"
        variant="text"
        size="xs"
        onClick={(event) => {
          removeLink();
          event.preventDefault();
          event.stopPropagation();
        }}
      />
    </Card>
  );
};

export { LinkMenu };
