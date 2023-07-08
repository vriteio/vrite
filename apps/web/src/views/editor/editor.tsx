import { BubbleMenu, LinkPreviewMenu, FloatingMenu } from "./menus";
import {
  BubbleMenuWrapper,
  FloatingMenuWrapper,
  SolidEditor,
  SolidEditorContent,
  useEditor
} from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on, onCleanup } from "solid-js";
import { HardBreak, Paragraph, Text, Comment } from "@vrite/editor";
import { isTextSelection } from "@tiptap/core";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Typography } from "@tiptap/extension-typography";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { CharacterCount } from "@tiptap/extension-character-count";
import * as Y from "yjs";
import { useNavigate } from "@solidjs/router";
import { CellSelection } from "@tiptap/pm/tables";
import { AllSelection } from "@tiptap/pm/state";
import { createMediaQuery } from "@solid-primitives/media";
import clsx from "clsx";
import {
  Document,
  Placeholder,
  TrailingNode,
  LinkPreviewWrapper,
  SlashMenuPlugin,
  BlockActionMenuPlugin,
  CollabCursor,
  Collab,
  createClipboardSerializer,
  createExtensions,
  createBlockMenuOptions,
  BlockPaste,
  TableMenuPlugin,
  CommentMenuPlugin
} from "#lib/editor";
import { App, hasPermission, useAuthenticatedContext, useUIContext } from "#context";
import { createRef } from "#lib/utils";

interface EditorProps {
  reloaded?: boolean;
  editedContentPiece: App.ExtendedContentPieceWithAdditionalData<"locked">;
  onLoad?(): void;
  reload?(): void;
}

const Editor: Component<EditorProps> = (props) => {
  const { setStorage, setReferences } = useUIContext();
  const md = createMediaQuery("(min-width: 768px)");
  const navigate = useNavigate();
  const ydoc = new Y.Doc();
  const provider = new HocuspocusProvider({
    token: "vrite",
    url: `ws${window.location.protocol.includes("https") ? "s" : ""}://${
      import.meta.env.PUBLIC_COLLAB_HOST
    }`,
    async onSynced() {
      props.onLoad?.();
    },
    async onAuthenticationFailed() {
      if (props.reloaded) {
        navigate("/");
      } else {
        await fetch("/session/refresh", { method: "POST" });
        props.reload?.();
      }
    },
    name: props.editedContentPiece.id || "",
    document: ydoc
  });
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const [bubbleMenuOpened, setBubbleMenuOpened] = createSignal(true);
  const [floatingMenuOpened, setFloatingMenuOpened] = createSignal(true);
  const { workspaceSettings } = useAuthenticatedContext();

  let el: HTMLElement | null = null;

  const editor = useEditor({
    onCreate({ editor }) {
      if (workspaceSettings()) {
        editor.view.setProps({
          clipboardSerializer: createClipboardSerializer(editor, workspaceSettings()!)
        });
      }
    },
    extensions: [
      BlockPaste.configure({ workspaceSettings }),
      Document,
      Placeholder,
      Paragraph,
      Text,
      HardBreak,
      Typography,
      Comment,
      ...(workspaceSettings() ? createExtensions(workspaceSettings()!, provider) : []),
      TrailingNode,
      CharacterCount,
      Gapcursor,
      Dropcursor.configure({ class: "ProseMirror-dropcursor" }),
      SlashMenuPlugin.configure({
        menuItems: workspaceSettings() ? createBlockMenuOptions(workspaceSettings()!) : []
      }),
      BlockActionMenuPlugin,
      TableMenuPlugin,
      CommentMenuPlugin,
      Collab.configure({
        document: ydoc
      }),
      CollabCursor(provider)
    ],
    // enablePasteRules: false,
    editable: !props.editedContentPiece.locked && hasPermission("editContent"),
    editorProps: { attributes: { class: `outline-none` } },
    onBlur({ event }) {
      el = event?.relatedTarget as HTMLElement | null;
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

  onCleanup(() => {
    editor().destroy();
    provider.destroy();
    setReferences({
      editor: undefined,
      provider: undefined,
      editedContentPiece: undefined
    });
  });
  setStorage((storage) => ({ ...storage, toolbarView: "editor" }));
  createEffect(
    on([() => props.editedContentPiece, editor], () => {
      setReferences({
        editor: editor(),
        provider,
        editedContentPiece: props.editedContentPiece
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
              animation: md() ? "scale-subtle" : "shift-away-subtle",
              onHide() {
                if (containerRef()?.contains(el)) return false;
              },
              maxWidth: "100%"
            }}
            shouldShow={({ editor }) => shouldShow(editor as SolidEditor)}
          >
            <BubbleMenu
              class={clsx(!md() && "m-0 w-screen -left-1 rounded-none border-x-0")}
              editor={editor()}
              opened={bubbleMenuOpened()}
              contentPieceId={props.editedContentPiece.id}
            />
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
