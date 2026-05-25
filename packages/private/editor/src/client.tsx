import {
  Document,
  Text,
  Paragraph,
  HardBreak,
  Heading,
  Link,
  Bold,
  Underline,
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
  TableRow,
  Comment,
  Property,
  Fragment
} from "./schema";
import { BubbleMenu } from "./ui/menus/bubble-menu";
import { BlockSelection as BlockSelectionMenu } from "./ui/block-selection";
import { HocuspocusProvider, HocuspocusProviderWebsocket } from "@hocuspocus/provider";
import {
  SolidEditorContent,
  BubbleMenuWrapper,
  useEditor,
  SolidEditor,
  SolidNodeViewRenderer
} from "@andesine/tiptap-solid";
import { Component, createMemo, Show } from "solid-js";
import { isTextSelection } from "@tiptap/core";
import { IndexeddbPersistence } from "y-indexeddb";
import { SlashMenu } from "./ui/menus/slash-menu";
import { createRef } from "@andesine/components/ref";
import { BlockMenu, BlockMenuArea } from "./ui/menus/block-menu";
import { ScrollShadow } from "@andesine/components/fragments";
import { ShortcutsProvider } from "@andesine/components/context";
import { Title } from "./schema/title";
import { PropertyView } from "./ui/views/property-view";
import { FragmentView } from "./ui/views/fragment-view";
import {
  Separator,
  TrailingNode,
  Collaboration,
  CollaborationCursor,
  Placeholder,
  UniqueID,
  BlockSelection,
  isBlockSelection
} from "./extensions";

interface ClientEditorProps {
  url: string;
  doc: string;
  notify(type: "success" | "error", text: string): void;
}

const ClientEditor: Component<ClientEditorProps> = (props) => {
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const socket = new HocuspocusProviderWebsocket({
    url: props.url
  });
  const explorerProvider = new HocuspocusProvider({
    websocketProvider: socket,
    token: "andesine",
    name: "explorer"
  });

  const provider = createMemo<HocuspocusProvider, HocuspocusProvider>((previousProvider) => {
    if (previousProvider) {
      previousProvider.destroy();
    }

    const provider = new HocuspocusProvider({
      websocketProvider: socket,
      name: props.doc,
      url: props.url
    });

    new IndexeddbPersistence(props.doc, provider.document);

    return provider;
  });
  const editor = createMemo<SolidEditor, SolidEditor>(() => {
    return useEditor({
      extensions: [
        // Basic
        Document,
        Paragraph,
        Text,
        HardBreak,
        Title,
        Property.extend({
          addNodeView() {
            return SolidNodeViewRenderer(PropertyView);
          }
        }),
        Fragment.extend({
          addNodeView() {
            return SolidNodeViewRenderer(FragmentView);
          }
        }),
        // Marks
        Link,
        Bold,
        Underline,
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
        // Lists
        BulletList,
        OrderedList,
        TaskList,
        TaskItem,
        ListItem,
        // Tables
        Table,
        TableCell,
        TableHeader,
        TableRow,
        // Other
        Comment,
        UniqueID,
        BlockSelection,
        Collaboration.configure({
          document: provider().document
        }),
        CollaborationCursor.configure({
          provider: provider(),
          user: { name: "John Doe", color: "#ffcc00" }
        }),
        TrailingNode,
        Placeholder,
        Separator
      ],
      editorProps: { attributes: { class: `outline-none min-h-full` } }
    })();
  });

  return (
    <ShortcutsProvider>
      <BlockSelectionMenu editor={editor()} scrollableContainerRef={scrollableContainerRef}>
        <BlockMenuArea editor={editor()}>
          <div class="overflow-hidden relative flex h-full w-full">
            <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
            <div class="p-5 overflow-auto w-full z-0 relative" ref={setScrollableContainerRef}>
              <div class="w-full flex flex-col items-center">
                <div
                  class="w-full prose-editor z-1 max-w-[44rem] prose dark:prose-invert flex flex-col relative"
                  id="editor-container"
                >
                  <Show when={editor()} keyed>
                    <BubbleMenuWrapper
                      editor={editor()}
                      tippyOptions={{
                        duration: [150, 100],
                        zIndex: 60,
                        hideOnClick: false,
                        interactive: true,
                        maxWidth: "100%"
                      }}
                      shouldShow={({ editor }) => {
                        const { state } = editor;
                        const { selection } = state;

                        return (
                          !isBlockSelection(selection) &&
                          isTextSelection(selection) &&
                          !selection.empty
                        );
                      }}
                    >
                      <BubbleMenu
                        opened
                        editor={editor()}
                        blur={() => {
                          editor().commands.blur();
                        }}
                      />
                    </BubbleMenuWrapper>
                    <SlashMenu editor={editor()} />
                  </Show>
                  <Show when={editor()} keyed>
                    <BlockMenu editor={editor()} />
                  </Show>
                  <SolidEditorContent editor={editor()} class="min-h-full" />
                </div>
              </div>
            </div>
          </div>
        </BlockMenuArea>
      </BlockSelectionMenu>
    </ShortcutsProvider>
  );
};

export { ClientEditor };
