import { BubbleMenu, LinkPreviewMenu, FloatingMenu } from "../editor/menus";
import {
  BubbleMenuWrapper,
  FloatingMenuWrapper,
  SolidEditorContent,
  useEditor
} from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on, onCleanup } from "solid-js";
import { HardBreak, Paragraph, Text, Comment } from "@vrite/editor";
import { isTextSelection } from "@tiptap/core";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import { useNavigate } from "@solidjs/router";
import { useUIContext } from "#context";
import {
  Heading,
  Link,
  Bold,
  Code,
  Italic,
  HorizontalRule,
  Blockquote,
  Highlight,
  Superscript,
  Subscript,
  Strike,
  BulletList,
  OrderedList,
  TaskList,
  TaskItem,
  ListItem,
  Table,
  TableCell,
  TableHeader,
  TableRow
} from "@vrite/editor";
import {
  Document,
  Placeholder,
  TrailingNode,
  LinkPreviewWrapper,
  SlashMenuPlugin,
  BlockActionMenuPlugin,
  CollabCursor,
  Collab,
  createExtensions,
  createBlockMenuOptions,
  BlockPaste,
  TableMenuPlugin,
  CommentMenuPlugin,
  CodeBlock,
  Image,
  Embed
} from "#lib/editor";
import { CellSelection } from "@tiptap/pm/tables";
import { AllSelection } from "@tiptap/pm/state";

const Editor: Component = () => {
  const { storage, setStorage, setReferences } = useUIContext();
  const [bubbleMenuOpened, setBubbleMenuOpened] = createSignal(true);
  const [floatingMenuOpened, setFloatingMenuOpened] = createSignal(true);
  const editor = useEditor({
    extensions: [
      BlockPaste,
      Document,
      Placeholder,
      Paragraph,
      Text,
      HardBreak,
      Typography,
      Comment,
      Bold,
      Italic,
      Strike,
      Code,
      Link,
      Highlight,
      Subscript,
      Superscript,
      Heading,
      BulletList,
      OrderedList,
      TaskList,
      Blockquote,
      CodeBlock,
      HorizontalRule,
      Image,
      Embed,
      ListItem,
      TaskItem,
      Table,
      TableCell,
      TableHeader,
      TableRow,
      TrailingNode,
      CharacterCount,
      Gapcursor,
      Dropcursor.configure({ class: "ProseMirror-dropcursor" }),
      SlashMenuPlugin.configure({
        menuItems: createBlockMenuOptions()
      }),
      //BlockActionMenuPlugin,
      TableMenuPlugin
      // CommentMenuPlugin
    ],
    editorProps: { attributes: { class: `outline-none` } },
    content: storage().html,
    onUpdate: ({ editor }) => {
      setStorage((storage) => ({
        ...storage,
        html: editor.getHTML()
      }));
    }
  });

  onCleanup(() => {
    editor().destroy();
    setReferences({
      editor: undefined,
      provider: undefined,
      editedContentPiece: undefined
    });
  });
  setStorage((storage) => ({ ...storage, toolbarView: "editorStandalone" }));
  createEffect(
    on([editor], () => {
      setReferences({
        editor: editor()
      });
    })
  );

  return (
    <>
      <div
        class="w-full prose prose-editor text-xl dark:prose-invert h-full relative"
        id="pm-container"
      >
        {editor() && (
          <LinkPreviewWrapper editor={editor()}>
            {(link) => {
              return <LinkPreviewMenu link={link} />;
            }}
          </LinkPreviewWrapper>
        )}
        {editor() && (
          <BubbleMenuWrapper
            editor={editor()}
            tippyOptions={{
              duration: [300, 250],
              zIndex: 30,
              animation: "scale-subtle",
              maxWidth: "100%"
            }}
            shouldShow={({ editor, state, view, from, to }) => {
              const { doc, selection } = state;
              const { empty } = selection;
              const isAllSelection = selection instanceof AllSelection;
              const isCellSelection = selection instanceof CellSelection;
              const isEmptyTextBlock =
                !doc.textBetween(from, to).length && isTextSelection(state.selection);

              if (!view.hasFocus() || isAllSelection) {
                setBubbleMenuOpened(false);

                return false;
              }

              if (isCellSelection) {
                setBubbleMenuOpened(true);

                return true;
              }

              if (
                ["image", "codeBlock", "embed", "horizontalRule"].some((name) => {
                  return editor.isActive(name);
                })
              ) {
                setBubbleMenuOpened(false);

                return false;
              }

              if (empty || isEmptyTextBlock) {
                setBubbleMenuOpened(false);

                return false;
              }

              setBubbleMenuOpened(true);

              return true;
            }}
          >
            <BubbleMenu editor={editor()} opened={bubbleMenuOpened()} />
          </BubbleMenuWrapper>
        )}
        {editor() && (
          <FloatingMenuWrapper
            editor={editor()}
            shouldShow={({ view, state }) => {
              const { selection } = state;
              const { $anchor, empty } = selection;
              const isRootDepth = $anchor.depth === 1;
              const isEmptyTextBlock =
                $anchor.parent.isTextblock &&
                !$anchor.parent.type.spec.code &&
                $anchor.parent.type.name === "paragraph" &&
                !$anchor.parent.textContent;

              if (
                !view.hasFocus() ||
                !empty ||
                !isRootDepth ||
                !isEmptyTextBlock ||
                !editor().isEditable
              ) {
                setFloatingMenuOpened(false);

                return false;
              }

              setFloatingMenuOpened(true);

              return true;
            }}
          >
            <FloatingMenu editor={editor()} opened={floatingMenuOpened()} />
          </FloatingMenuWrapper>
        )}
        <SolidEditorContent editor={editor()} />
      </div>
    </>
  );
};

export { Editor };
