import { initialContent } from "./initial-content";
import { BubbleMenu, LinkPreviewMenu, FloatingMenu } from "../editor/menus";
import {
  BubbleMenuWrapper,
  FloatingMenuWrapper,
  SolidEditor,
  SolidEditorContent,
  useEditor
} from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on, onCleanup } from "solid-js";
import { isTextSelection } from "@tiptap/core";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Typography } from "@tiptap/extension-typography";
import { CharacterCount } from "@tiptap/extension-character-count";
import { History } from "@tiptap/extension-history";
import {
  HardBreak,
  Paragraph,
  Text,
  Comment,
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
import { CellSelection } from "@tiptap/pm/tables";
import { AllSelection } from "@tiptap/pm/state";
import { Instance } from "tippy.js";
import clsx from "clsx";
import { Dropdown } from "@vrite/components";
import {
  Document,
  Placeholder,
  TrailingNode,
  LinkPreviewWrapper,
  SlashMenuPlugin,
  createBlockMenuOptions,
  BlockPaste,
  TableMenuPlugin,
  CodeBlock,
  Image,
  Embed
} from "#lib/editor";
import { useUIContext } from "#context";
import { createRef } from "#lib/utils";
import { BlockMenu } from "#lib/editor/extensions/slash-menu/component";

const Editor: Component = () => {
  const { storage, setStorage, setReferences, breakpoints } = useUIContext();
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [bubbleMenuOpened, setBubbleMenuOpened] = createSignal(true);
  const [bubbleMenuInstance, setBubbleMenuInstance] = createSignal<Instance | null>(null);
  const [floatingMenuOpened, setFloatingMenuOpened] = createSignal(true);
  const [blockMenuOpened, setBlockMenuOpened] = createSignal(false);
  const [showBlockBubbleMenu, setShowBlockBubbleMenu] = createSignal(false);

  if (!storage().html) {
    setStorage((storage) => ({ ...storage, html: initialContent }));
  }

  let el: HTMLElement | null = null;

  const editor = useEditor({
    extensions: [
      BlockPaste,
      Document,
      Placeholder,
      Paragraph,
      Text,
      History,
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
      // BlockActionMenuPlugin,
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
  const shouldShow = (editor: SolidEditor): boolean => {
    el = null;

    const { state, view } = editor;
    const { doc, selection } = state;
    const { ranges } = selection;
    const from = Math.min(...ranges.map((range) => range.$from.pos));
    const to = Math.max(...ranges.map((range) => range.$to.pos));
    const { empty } = selection;
    const isAllSelection = selection instanceof AllSelection;
    const isCellSelection = selection instanceof CellSelection;
    const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(state.selection);

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
  };
  const shouldShowFloatingMenu = (editor: SolidEditor): boolean => {
    const { state, view } = editor;
    const { selection } = state;
    const { $anchor, empty } = selection;
    const isRootDepth = $anchor.depth === 1;
    const isEmptyTextBlock =
      $anchor.parent.isTextblock &&
      !$anchor.parent.type.spec.code &&
      $anchor.parent.type.name === "paragraph" &&
      !$anchor.parent.textContent;

    if (!view.hasFocus() || !empty || !isRootDepth || !isEmptyTextBlock || !editor.isEditable) {
      setFloatingMenuOpened(false);

      return false;
    }

    setFloatingMenuOpened(true);

    return true;
  };

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
        class="w-full max-w-[70ch] prose prose-editor text-xl dark:prose-invert h-full relative"
        ref={setContainerRef}
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
              hideOnClick: false,
              interactive: true,
              animation: breakpoints.md() ? "scale-subtle" : "shift-away-subtle",
              onHide() {
                if (containerRef()?.contains(el)) return false;
              },
              onCreate(instance) {
                setBubbleMenuInstance(instance);
              },
              maxWidth: "100%"
            }}
            shouldShow={({ editor }) => {
              if (!breakpoints.md() && shouldShowFloatingMenu(editor as SolidEditor)) {
                setShowBlockBubbleMenu(true);

                return true;
              }

              setShowBlockBubbleMenu(false);

              return shouldShow(editor as SolidEditor);
            }}
          >
            <BubbleMenu
              class={clsx(!breakpoints.md() && "m-0 w-screen -left-1 rounded-none border-x-0")}
              editor={editor()}
              opened={bubbleMenuOpened()}
              setBlockMenuOpened={setBlockMenuOpened}
              mode={showBlockBubbleMenu() ? "block" : undefined}
              blur={() => {
                editor().commands.blur();
                el = null;
                bubbleMenuInstance()?.hide();
              }}
            />
          </BubbleMenuWrapper>
        )}
        {editor() && breakpoints.md() && (
          <FloatingMenuWrapper
            editor={editor()}
            shouldShow={({ editor }) => {
              return shouldShowFloatingMenu(editor as SolidEditor);
            }}
          >
            <FloatingMenu editor={editor()} opened={floatingMenuOpened()} />
          </FloatingMenuWrapper>
        )}
        {editor() && !breakpoints.md() && (
          <Dropdown
            activatorButton={() => <div />}
            opened={blockMenuOpened()}
            setOpened={setBlockMenuOpened}
          >
            <BlockMenu
              items={createBlockMenuOptions()}
              close={() => setBlockMenuOpened(false)}
              editor={editor()}
            />
          </Dropdown>
        )}
        <SolidEditorContent editor={editor()} />
      </div>
    </>
  );
};

export { Editor };
