import { BubbleMenu, LinkPreviewMenu, FloatingMenu } from "./menus";
import {
  BubbleMenuWrapper,
  FloatingMenuWrapper,
  SolidEditor,
  SolidEditorContent,
  useEditor
} from "@vrite/tiptap-solid";
import { Component, createEffect, createSignal, on, onCleanup } from "solid-js";
import { HardBreak, Paragraph, Text } from "@vrite/editor";
import { Extension, isTextSelection } from "@tiptap/core";
import { convert as convertToSlug } from "url-slug";
import { Gapcursor } from "@tiptap/extension-gapcursor";
import { Dropcursor } from "@tiptap/extension-dropcursor";
import { Typography } from "@tiptap/extension-typography";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { CharacterCount } from "@tiptap/extension-character-count";
import * as Y from "yjs";
import { useLocation, useNavigate } from "@solidjs/router";
import { CellSelection } from "@tiptap/pm/tables";
import { AllSelection, NodeSelection } from "@tiptap/pm/state";
import clsx from "clsx";
import { Instance } from "tippy.js";
import { scrollIntoView } from "seamless-scroll-polyfill";
import { Dropdown } from "#components/primitives";
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
  ElementMenuPlugin,
  CommentMenuPlugin,
  AutoDir
} from "#lib/editor";
import {
  App,
  hasPermission,
  useAuthenticatedUserData,
  useHostConfig,
  useSharedState
} from "#context";
import { breakpoints, createRef } from "#lib/utils";
import { BlockMenu } from "#lib/editor/extensions/slash-menu/component";

declare module "#context" {
  interface SharedState {
    editor: SolidEditor;
    provider: HocuspocusProvider;
    editedContentPiece: App.ExtendedContentPieceWithAdditionalData<"locked">;
  }
}

interface EditorProps {
  reloaded?: boolean;
  editedContentPiece: App.ExtendedContentPieceWithAdditionalData<"locked">;
  onLoad?(): void;
  reload?(): void;
}

const Editor: Component<EditorProps> = (props) => {
  const hostConfig = useHostConfig();
  const createSharedSignal = useSharedState();
  const navigate = useNavigate();
  const location = useLocation<{ breadcrumb?: string[] }>();
  const [activeVariant] = createSharedSignal("activeVariant");
  const ydoc = new Y.Doc();
  const [containerRef, setContainerRef] = createRef<HTMLElement | null>(null);
  const handleReload = async (): Promise<void> => {
    if (props.reloaded) {
      navigate("/");
    } else {
      await fetch("/session/refresh", { method: "POST" });
      props.reload?.();
    }
  };
  const scrollToHeading = (): void => {
    const headingText = location.state?.breadcrumb?.at(-1) || "";

    if (headingText) {
      const slug = convertToSlug(headingText);
      const heading = containerRef()?.querySelector(`[data-slug="${slug}"]`);

      if (heading) {
        scrollIntoView(heading, { behavior: "smooth", block: "start" });
      }
    }
  };
  const provider = new HocuspocusProvider({
    token: "vrite",
    url: window.env.PUBLIC_COLLAB_URL.replace("http", "ws"),
    async onSynced() {
      props.onLoad?.();
      scrollToHeading();
    },
    onDisconnect: handleReload,
    onAuthenticationFailed: handleReload,
    name: `${props.editedContentPiece.id || ""}${activeVariant() ? ":" : ""}${
      activeVariant()?.id || ""
    }`,
    document: ydoc
  });
  const [bubbleMenuOpened, setBubbleMenuOpened] = createSignal(true);
  const [bubbleMenuInstance, setBubbleMenuInstance] = createSignal<Instance | null>(null);
  const [floatingMenuOpened, setFloatingMenuOpened] = createSignal(true);
  const [blockMenuOpened, setBlockMenuOpened] = createSignal(false);
  const [showBlockBubbleMenu, setShowBlockBubbleMenu] = createSignal(false);
  const { workspaceSettings } = useAuthenticatedUserData();

  let el: HTMLElement | null = null;

  const editor = useEditor({
    onCreate({ editor }) {
      if (workspaceSettings()) {
        editor.view.setProps({
          clipboardSerializer: createClipboardSerializer(editor, workspaceSettings()!)
        });
      }
      window.editor = editor;
    },
    extensions: [
      BlockPaste.configure({ workspaceSettings }),
      Document,
      Placeholder,
      Paragraph,
      Text,
      HardBreak,
      Typography,
      ...(workspaceSettings() ? createExtensions(workspaceSettings()!, provider) : []),
      TrailingNode,
      CharacterCount,
      AutoDir,
      Gapcursor,
      Dropcursor.configure({ class: "ProseMirror-dropcursor" }),
      SlashMenuPlugin.configure({
        menuItems: workspaceSettings() ? createBlockMenuOptions(workspaceSettings()!) : []
      }),
      hostConfig.extensions && BlockActionMenuPlugin,
      TableMenuPlugin,
      ElementMenuPlugin,
      CommentMenuPlugin,
      Collab.configure({
        document: ydoc
      }),
      CollabCursor(provider)
    ].filter(Boolean) as Extension[],
    editable: !props.editedContentPiece.locked && hasPermission("editContent"),
    editorProps: { attributes: { class: `outline-none` } },
    onBlur({ event }) {
      el = event?.relatedTarget as HTMLElement | null;
    }
  });
  const [, setSharedEditor] = createSharedSignal("editor", editor());
  const [, setSharedProvider] = createSharedSignal("provider", provider);
  const [, setEditedContentPiece] = createSharedSignal(
    "editedContentPiece",
    props.editedContentPiece
  );
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
    const isNodeSelection = selection instanceof NodeSelection;
    const isEmptyTextBlock = !doc.textBetween(from, to).length && isTextSelection(state.selection);

    if ((!view.hasFocus() && !isNodeSelection) || isAllSelection) {
      setBubbleMenuOpened(false);

      return false;
    }

    if (isCellSelection) {
      setBubbleMenuOpened(true);

      return true;
    }

    if (
      isNodeSelection &&
      ["horizontalRule", "image", "codeBlock", "embed", "element", "paragraph"].some((name) => {
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
    const isRootDepth =
      $anchor.depth === 1 ||
      ["element", "blockquote"].includes($anchor.node($anchor.depth - 1)?.type?.name);
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
    provider.destroy();
    setSharedEditor(undefined);
    setSharedProvider(undefined);
    setEditedContentPiece(undefined);
  });
  createEffect(
    on(
      () => location.state,
      () => {
        scrollToHeading();
      }
    )
  );
  createEffect(
    on([() => props.editedContentPiece, editor], () => {
      setEditedContentPiece(props.editedContentPiece);
      setSharedEditor(editor());
      setSharedProvider(provider);
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
            {(link, tippyInstance) => {
              return <LinkPreviewMenu link={link} tippyInstance={tippyInstance} />;
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
              contentPieceId={props.editedContentPiece.id}
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
              items={workspaceSettings() ? createBlockMenuOptions(workspaceSettings()!) : []}
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
