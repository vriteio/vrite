import { SolidEditorContent, useEditor } from "@vrite/tiptap-solid";
import {
  Link,
  Paragraph,
  Text,
  Bold,
  Underline,
  Code,
  Italic,
  Blockquote,
  Highlight,
  Superscript,
  Subscript,
  Strike,
  BulletList,
  OrderedList,
  TaskList,
  ListItem,
  TaskItem,
  HardBreak,
  Heading
} from "@vrite/editor";
import { Component, createEffect, on } from "solid-js";
import { Typography } from "@tiptap/extension-typography";
import clsx from "clsx";
import { Editor, Extensions } from "@tiptap/core";
import { debounce } from "@solid-primitives/scheduled";
import { TrailingNode, Placeholder, Document } from "#lib/editor";

interface ExtensionOptions {
  content?: string;
  extensions?: Extensions;
  placeholder?: string;
  lists?: boolean;
  blocks?: boolean;
  inline?: boolean;
}
interface MiniEditorProps extends ExtensionOptions {
  class?: string;
  initialValue: string;
  readOnly?: boolean;
  handleValueUpdates?: boolean;
  onChange?(editor: Editor): void;
  onUpdate?(editor: Editor): void;
  onBlur?(editor: Editor): void;
}

const getExtensions = (options: ExtensionOptions): Extensions => {
  const extensions = [
    options.content ? Document.extend({ content: options.content }) : Document,
    Placeholder.configure({
      placeholder: ({ node, editor }) => {
        if (node.type.name === "paragraph" && editor.state.doc.firstChild === node) {
          return options.placeholder || "";
        }

        return "";
      }
    }),
    Paragraph,
    Text,
    HardBreak,
    TrailingNode,
    ...(options.blocks ? [Heading, Blockquote] : []),
    ...(options.lists ? [BulletList, OrderedList, TaskList, TaskItem, ListItem] : []),
    ...(options.extensions || [])
  ];

  if (options.inline) {
    extensions.push(
      Bold,
      Underline,
      Code,
      Italic,
      Strike,
      Link,
      Highlight,
      Superscript,
      Subscript,
      Typography
    );
  }

  return extensions;
};
const MiniEditor: Component<MiniEditorProps> = (props) => {
  const handleChange = debounce((editor: Editor) => {
    props.onChange?.(editor);
  }, 350);
  const editor = useEditor({
    editable: !props.readOnly,
    extensions: getExtensions(props),
    editorProps: { attributes: { class: `outline-none` } },
    content: props.initialValue,
    onUpdate({ editor }) {
      props.onUpdate?.(editor);
      handleChange.clear();
      handleChange(editor);
    },
    onBlur({ editor }) {
      props.onBlur?.(editor);
    }
  });

  if (props.handleValueUpdates !== false) {
    createEffect(
      on(
        () => props.initialValue,
        () => {
          if (editor().isDestroyed) {
            return;
          }

          if (props.initialValue) {
            const { from, to } = editor().state.selection;

            editor().commands.setContent(props.initialValue, false);
            editor().commands.setTextSelection({ from, to });
          } else {
            editor().commands.clearContent(false);
          }
        }
      )
    );
  }

  createEffect(
    on(
      () => props.readOnly,
      () => {
        if (editor().isDestroyed) {
          return;
        }

        editor().setEditable(!props.readOnly, false);
      }
    )
  );

  return (
    <div
      class={clsx("w-full text-lg", props.class)}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      <SolidEditorContent editor={editor()} class="flex-1" />
    </div>
  );
};

export { MiniEditor };
