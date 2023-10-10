import { mdiCheck, mdiDelete } from "@mdi/js";
import clsx from "clsx";
import { Component, createEffect, createSignal, on } from "solid-js";
import { SolidEditor } from "@vrite/tiptap-solid";
import { Card, Input, IconButton } from "#components/primitives";
import { createRef } from "#lib/utils";

const LinkMenu: Component<{
  class?: string;
  mode: string;
  opened: boolean;
  editor: SolidEditor;
  setMode(mode: string): void;
}> = (props) => {
  const [link, setLink] = createSignal("");
  const [linkInputRef, setLinkInputRef] = createRef<HTMLInputElement | null>(null);
  const saveLink = (): void => {
    props.editor.chain().unsetCode().setLink({ href: link() }).focus().run();
    props.setMode("format");
  };

  createEffect(
    on(
      () => props.opened,
      (opened) => {
        if (!opened) {
          setLink("");
        }
      }
    )
  );
  createEffect(
    on(
      () => props.mode,
      (mode) => {
        if (mode === "link") {
          setLink(props.editor.getAttributes("link").href || "");
          setTimeout(() => {
            const linkInput = linkInputRef();

            linkInput?.focus();
          }, 300);
        } else {
          setLink("");
        }
      }
    )
  );

  return (
    <Card
      class={clsx(
        "relative flex p-0 overflow-x-auto scrollbar-hidden md:overflow-initial not-prose",
        props.class
      )}
    >
      <Input
        ref={setLinkInputRef}
        value={link()}
        placeholder="Paste a link..."
        wrapperClass="w-full md:w-auto"
        setValue={(value) => {
          setLink(value);
        }}
        onEnter={saveLink}
        class="py-0 my-0 bg-transparent"
      />
      <IconButton path={mdiCheck} text="soft" variant="text" onClick={saveLink} />
      <IconButton
        path={mdiDelete}
        text="soft"
        variant="text"
        onClick={() => {
          props.editor.chain().unsetLink().focus().run();
          props.setMode("format");
        }}
      />
    </Card>
  );
};

export { LinkMenu };
