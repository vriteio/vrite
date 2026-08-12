import clsx from "clsx";
import { type Component, createSignal, onMount, Show } from "solid-js";
import { Card, IconButton, Input, Shortcut, Tooltip, createRef } from "@andesine/components";
import { type Editor } from "@tiptap/core";
import { validateURL } from "#editor/lib";

const LinkMenu: Component<{
  editor: Editor;
  class?: string;
  opened?: boolean;
  setMode(mode: string): void;
}> = (props) => {
  const [url, setUrl] = createSignal("");
  const [hasLink, setHasLink] = createSignal(false);
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
    setHasLink(Boolean(href));
    setTimeout(() => inputRef()?.focus(), 50);
  });

  return (
    <Card
      data-menu="link"
      class={clsx(
        "relative flex w-full max-w-full p-1 gap-1 rounded-none overflow-x-auto scrollbar-hidden items-center not-prose bg-gray-50 md:w-auto md:max-w-none md:rounded-xl md:overflow-visible",
        props.class
      )}
      shade
    >
      <Tooltip
        content={
          <div class="flex flex-col items-center justify-center gap-0.5">
            <span>Go back</span>
          </div>
        }
        side="bottom"
        wrapperClass="snap-start shrink-0"
        enabled={props.opened}
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
      </Tooltip>
      <Input
        ref={setInputRef}
        value={url()}
        setValue={(value) => {
          setUrl(value);
          setInvalid(false);
        }}
        slot={() => (
          <Show when={invalid()}>
            <div class="absolute right-2">
              <Tooltip content="Invalid URL. Only HTTP, HTTPS, and mailto links are allowed.">
                <div class="i-lucide:triangle-alert h-4 w-4 text-red-500" />
              </Tooltip>
            </div>
          </Show>
        )}
        placeholder="Enter URL..."
        onEnter={saveLink}
        class="py-0 my-0 flex-1 w-40"
        aria-invalid={invalid()}
        variant="outlined"
        color="contrast"
        size="xs"
      />
      <Tooltip
        content={
          <div class="flex flex-col items-center justify-center gap-0.5">
            <span>Save link</span>
            <Shortcut class="opacity-50 font-mono text-[80%]" shortcut="enter" />
          </div>
        }
        enabled={props.opened}
        side="bottom"
      >
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
      </Tooltip>
      <Show when={hasLink()}>
        <Tooltip
          content={
            <div class="flex flex-col items-center justify-center gap-0.5">
              <span>Remove link</span>
            </div>
          }
          side="bottom"
          wrapperClass="snap-start shrink-0"
          enabled={props.opened}
        >
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
        </Tooltip>
      </Show>
    </Card>
  );
};

export { LinkMenu };
