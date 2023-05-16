import { SolidEditorContent, useEditor } from "@vrite/tiptap-solid";
import { Link } from "@tiptap/extension-link";
import { Component, createEffect, on } from "solid-js";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Bold } from "@tiptap/extension-bold";
import { Code } from "@tiptap/extension-code";
import { Italic } from "@tiptap/extension-italic";
import { Blockquote } from "@tiptap/extension-blockquote";
import { Highlight } from "@tiptap/extension-highlight";
import { Superscript } from "@tiptap/extension-superscript";
import { Subscript } from "@tiptap/extension-subscript";
import { Strike } from "@tiptap/extension-strike";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { ListItem } from "@tiptap/extension-list-item";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Typography } from "@tiptap/extension-typography";
import clsx from "clsx";
import { Editor, Extensions } from "@tiptap/core";
import { debounce } from "@solid-primitives/scheduled";
import { TrailingNode, CustomPlaceholder, CustomDocument, Heading } from "#lib/editor";

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
    options.content ? CustomDocument.extend({ content: options.content }) : CustomDocument,
    CustomPlaceholder.configure({
      placeholder: ({ node, editor }) => {
        if (node.type.name === "paragraph" && editor.state.doc.firstChild === node) {
          return options.placeholder || "";
        }

        return "";
      }
    }),
    Paragraph,
    Text,
    TrailingNode,
    ...(options.blocks ? [Heading.extend({ content: "text*", marks: "" }), Blockquote] : []),
    ...(options.lists ? [BulletList, OrderedList, TaskList, TaskItem, ListItem] : []),
    ...(options.extensions || [])
  ];

  if (options.inline) {
    extensions.push(
      Bold,
      Code,
      Italic,
      Strike,
      Link.configure({ openOnClick: false }),
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
    <div class={clsx("w-full text-lg", props.class)}>
      <SolidEditorContent editor={editor()} class="flex-1" />
    </div>
  );
};

export { MiniEditor };
