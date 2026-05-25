import clsx from "clsx";
import { Component, createSignal, onMount } from "solid-js";
import { Card, IconButton, Input, createRef } from "@andesine/components";
import { Editor } from "@tiptap/core";

const LinkMenu: Component<{
  class?: string;
  editor: Editor;
  setMode(mode: string): void;
}> = (props) => {
  const [url, setUrl] = createSignal("");
  const [inputRef, setInputRef] = createRef<HTMLInputElement | null>(null);
  const saveLink = (): void => {
    const href = url().trim();

    if (href) {
      props.editor.chain().unsetCode().setLink({ href }).focus().run();
    }

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
        setValue={setUrl}
        placeholder="Enter URL..."
        onEnter={saveLink}
        class="py-0 my-0 flex-1 min-w-40"
        variant="outlined"
        color="contrast"
        size="xs"
      />
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
