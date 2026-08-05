import {
  Document,
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
  ListItem
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
import { Editor, isTextSelection } from "@tiptap/core";
import { SlashMenu } from "./ui/menus/slash-menu";
import { BlockMenuArea } from "./ui/menus/block-menu";
import { ScrollShadow, createRef } from "@andesine/components";
import { MAX_ENTRY_TITLE_LENGTH, normalizeEntryTitle, Title } from "./schema/title";
import {
  TrailingNode,
  Collaboration,
  CollaborationCaret,
  Placeholder,
  UniqueID,
  NodeRange,
  BlockSelection,
  isBlockSelection,
  Gapcursor,
  Dropcursor,
  NodeCharacterLimit
} from "./extensions";
import { BubbleMenuWrapper } from "./ui/bubble-menu-wrapper";
import { DragHandleMenu } from "./ui/drag-handle";

import type { EditorProps } from "./client-types";
import { useEditorProvider } from "./use-editor-provider";

const ClientEditor: Component<EditorProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [editorContentElement, setEditorContentElement] = createSignal<HTMLElement | null>(null);
  const provider = useEditorProvider({
    url: () => props.url,
    doc: () => props.doc,
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

    if (!contentElement || !currentProvider) {
      return null;
    }

    return new Editor({
      element: contentElement,
      editable: untrack(() => props.editable ?? true),
      extensions: [
        // Basic
        Document,
        Paragraph,
        Text,
        HardBreak,
        Title,
        NodeCharacterLimit.configure({ limits: { title: MAX_ENTRY_TITLE_LENGTH } }),
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
        UniqueID,
        Gapcursor,
        Dropcursor,
        BlockSelection,
        NodeRange,
        Collaboration.configure({
          document: currentProvider.document
        }),
        CollaborationCaret.configure({
          provider: currentProvider,
          user: collaborationUser()
        }),
        TrailingNode,
        Placeholder
      ],
      editorProps: { attributes: { class: `outline-none min-h-full` } },
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

      const ed = editor();

      if (ed && !ed.state.selection.empty && isTextSelection(ed.state.selection)) {
        setTimeout(() => {
          ed.view.dispatch(ed.state.tr.setMeta("forceUpdate", true));
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
        <div class="p-10 pt-5 overflow-auto w-full z-0 relative" ref={setScrollableContainerRef}>
          <BlockMenuArea editor={editableEditor()} notify={props.notify}>
            <div class="w-full flex flex-col items-center">
              <div
                class="w-full prose-editor z-1 max-w-[44rem] prose prose-headings:font-semibold prose-headings:text-gray-700 prose-bold:text-gray-700 dark:prose-invert flex flex-col relative"
                id="editor-container"
              >
                <Show when={editableEditor()} keyed>
                  {/* Order of menus is important, as every `registerPlugin()` call re-triggers `onDestroy` */}
                  <SlashMenu editor={editor()!} />
                  <BubbleMenuWrapper
                    editor={editor()!}
                    shouldShow={({ editor }) => {
                      //if (pointerDown()) return false;

                      const { state } = editor;
                      const { selection } = state;

                      return (
                        !isBlockSelection(selection) &&
                        isTextSelection(selection) &&
                        !selection.empty
                      );
                    }}
                  >
                    <BubbleMenu opened editor={editor()!} />
                  </BubbleMenuWrapper>
                  <DragHandleMenu editor={editor()!} />
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
export type { EditorProps } from "./client-types";
export type {
  EditorProvider,
  EditorProviderSetup,
  EditorProviderSetupResult
} from "./client-types";
