import {
  MAX_ENTRY_TITLE_LENGTH,
  normalizeEntryTitle,
  Title,
  createDocument,
  Text,
  Paragraph,
  HardBreak,
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
  Property,
  Fragment
} from "./schema";
import { BubbleMenu } from "./ui/menus/bubble-menu";
import { BlockSelection as BlockSelectionMenu } from "./ui/block-selection";
import {
  type Component,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  Show,
  untrack
} from "solid-js";
import { Editor, getSchema, isTextSelection } from "@tiptap/core";
import { yXmlFragmentToProseMirrorRootNode } from "@tiptap/y-tiptap";
import { SlashMenu } from "./ui/menus/slash-menu";
import { BlockMenuArea } from "./ui/menus/block-menu";
import { ScrollShadow, createRef } from "@andesine/components";
import clsx from "clsx";
import {
  ResourceNameTracker,
  SchemaConstraints,
  Separator,
  TrailingNode,
  Collaboration,
  CollaborationCaret,
  createPlaceholder,
  UniqueID,
  BlockSelection,
  Gapcursor,
  Dropcursor,
  NodeCharacterLimit,
  VersionDiff
} from "./extensions";
import { DragHandleMenu } from "./ui/drag-handle";

import type { EditorProps } from "./client-types";
import { useEditorProvider } from "./use-editor-provider";
import { createFragmentViewRenderer, createPropertyViewRenderer } from "./ui/views";
import { getOwner } from "solid-js/web";

const ClientEditor: Component<EditorProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [menuContainerRef, setMenuContainerRef] = createRef<HTMLElement | null>(null);
  const [editorContentElement, setEditorContentElement] = createSignal<HTMLElement | null>(null);
  const owner = getOwner();
  const collaborative = () => props.content === undefined;
  const provider = useEditorProvider({
    url: () => props.url,
    doc: () => props.doc,
    enabled: collaborative,
    attempt: () => props.providerAttempt,
    beforeAttach: () => props.beforeProviderAttach,
    onProvider: () => props.onProvider,
    onError: () => props.onProviderSetupError,
    notify: props.notify
  });

  const collaborationUser = () => {
    return props.collaborationUser || { name: "Anonymous", color: "#f59e0b" };
  };
  const editor = createMemo(() => {
    const contentElement = editorContentElement();
    const currentProvider = provider();
    const content = props.content;
    const editorMode = props.mode || "entry";

    if (!contentElement || (collaborative() && !currentProvider)) {
      return null;
    }

    const collaborationExtensions = currentProvider
      ? [
          Collaboration.configure({
            document: currentProvider.document
          }),
          CollaborationCaret.configure({
            provider: currentProvider,
            user: collaborationUser()
          })
        ]
      : [];
    const diffExtensions = props.diff ? [VersionDiff.configure({ ...props.diff, owner })] : [];
    const schemaExtensions = [SchemaConstraints.configure({ mode: editorMode })];
    const titleExtensions =
      editorMode === "entry"
        ? [Title, NodeCharacterLimit.configure({ limits: { title: MAX_ENTRY_TITLE_LENGTH } })]
        : [];
    const extensions = [
      // Basic
      createDocument(editorMode),
      Paragraph,
      Text,
      HardBreak,
      ...titleExtensions,
      Property.extend({
        addNodeView() {
          return createPropertyViewRenderer(
            owner,
            () => props.editable ?? true,
            editorMode === "schema"
          );
        }
      }),
      Fragment.extend({
        addNodeView() {
          return createFragmentViewRenderer(
            owner,
            () => props.editable ?? true,
            editorMode === "schema"
          );
        }
      }),
      // Marks
      Link,
      Bold,
      Code,
      Italic,
      Highlight,
      Superscript,
      Subscript,
      Strike,
      // Simple blocks
      HorizontalRule,
      Heading,
      Blockquote,
      BulletList,
      OrderedList,
      TaskList,
      TaskItem,
      ListItem,
      // Other
      ResourceNameTracker,
      ...schemaExtensions,
      UniqueID,
      Gapcursor,
      Dropcursor,
      BlockSelection,
      ...diffExtensions,
      ...collaborationExtensions,
      TrailingNode.configure({ mode: editorMode }),
      createPlaceholder(editorMode),
      Separator
    ];
    const initialContent =
      currentProvider && editorMode === "schema"
        ? yXmlFragmentToProseMirrorRootNode(
            currentProvider.document.getXmlFragment("default"),
            getSchema(extensions)
          ).toJSON()
        : content;

    return new Editor({
      content: initialContent,
      element: contentElement,
      editable: untrack(() => props.editable ?? true),
      extensions,
      editorProps: {
        attributes: {
          "class": `outline-none min-h-full`,
          "data-editor-mode": editorMode
        }
      },
      onUpdate: ({ editor }) => {
        const titleNode = editor.state.doc.firstChild;

        if (titleNode?.type.name === "title") {
          props.onTitleChange?.(normalizeEntryTitle(titleNode.textContent));
        }
      }
    });
  });

  createEffect((previousEditor: Editor | null) => {
    const currentEditor = editor();

    if (previousEditor && previousEditor !== currentEditor) {
      previousEditor.destroy();
    }

    return currentEditor;
  }, null);

  createEffect(() => {
    const currentEditor = editor();

    if (!currentEditor) return;

    currentEditor.setEditable(props.editable ?? true);
  });

  createEffect(() => {
    const currentEditor = editor();

    if (!currentEditor) return;

    const cleanup = props.onEditor?.(currentEditor);

    onCleanup(() => {
      cleanup?.();
    });
  });

  createEffect(() => {
    const scrollContainer = scrollableContainerRef();

    if (!scrollContainer) return;

    props.onScrollContainer?.(scrollContainer);

    onCleanup(() => {
      props.onScrollContainer?.(null);
    });
  });

  const editableEditor = () => (props.editable === false ? null : editor());

  onCleanup(() => {
    editor()?.destroy();
  });

  createEffect(() => {
    const isInsideBubbleMenu = (event: PointerEvent): boolean => {
      const target = event.target as HTMLElement | null;

      return !!target?.closest?.(".tippy-box");
    };
    const onDown = (event: PointerEvent) => {
      if (isInsideBubbleMenu(event)) return;
    };
    const onUp = (event: PointerEvent) => {
      if (isInsideBubbleMenu(event)) return;

      const currentEditor = editableEditor();

      if (
        currentEditor &&
        !currentEditor.state.selection.empty &&
        isTextSelection(currentEditor.state.selection)
      ) {
        setTimeout(() => {
          currentEditor.view.dispatch(currentEditor.state.tr.setMeta("forceUpdate", true));
        }, 10);
      }
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("pointerup", onUp);
    onCleanup(() => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("pointerup", onUp);
    });
  });

  return (
    <BlockSelectionMenu editor={editableEditor()} scrollableContainerRef={scrollableContainerRef}>
      <div class="overflow-hidden relative flex h-full w-full">
        <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
        <div
          class={clsx(
            "relative z-0 w-full overflow-x-hidden overflow-y-auto md:overflow-auto",
            props.class
          )}
          ref={setScrollableContainerRef}
          data-editor-scrollable-container
        >
          <div
            class="absolute inset-0 z-20 pointer-events-none not-prose [&>*]:pointer-events-auto"
            data-editor-menu-container
            ref={setMenuContainerRef}
          />
          <BlockMenuArea
            editor={editableEditor()}
            menuContainerRef={menuContainerRef}
            notify={(type, text) => props.notify?.(type, text)}
          >
            <div class="w-full flex flex-col items-center">
              <div
                class="w-full prose-editor z-1 max-w-[44rem] prose prose-headings:font-semibold prose-headings:text-gray-700 prose-bold:text-gray-700 flex flex-col relative"
                id="editor-container"
              >
                <Show when={editableEditor()} keyed>
                  {/* Order of menus is important, as every `registerPlugin()` call re-triggers `onDestroy` */}
                  <SlashMenu
                    editor={editor()!}
                    menuContainerRef={menuContainerRef}
                    mode={props.mode || "entry"}
                  />
                  <BubbleMenu editor={editor()!} menuContainerRef={menuContainerRef} />
                  <DragHandleMenu editor={editor()!} menuContainerRef={menuContainerRef} />
                </Show>
                <Show when={props.staticTitle} keyed>
                  {(title) => (
                    <header class="not-prose" data-type="title" data-static-editor-title>
                      <h1>{title}</h1>
                    </header>
                  )}
                </Show>
                <div ref={setEditorContentElement} class="min-h-full" />
              </div>
            </div>
          </BlockMenuArea>
        </div>
      </div>
    </BlockSelectionMenu>
  );
};

export { ClientEditor };
export type { EditorMode, EditorProps } from "./client-types";
export type {
  EditorProvider,
  EditorProviderSetup,
  EditorProviderSetupResult
} from "./client-types";
