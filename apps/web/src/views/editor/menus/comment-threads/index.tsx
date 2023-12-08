import { mdiCommentMultipleOutline } from "@mdi/js";
import { Editor } from "@tiptap/core";
import { Component, For, Show, createMemo, createResource } from "solid-js";
import { Dropdown, Heading, IconButton } from "#components/primitives";
import { App, useClient } from "#context";
import { CommentCard } from "#lib/editor";
import { createRef } from "#lib/utils";
import { ScrollShadow } from "#components/fragments";

interface CommentThreadsMenuProps {
  editedContentPiece: App.ContentPieceWithAdditionalData;
  editor: Editor;
}

const CommentThreadsMenu: Component<CommentThreadsMenuProps> = (props) => {
  const client = useClient();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLDivElement | null>(
    null
  );
  const [threads, { mutate: setThreads }] = createResource(
    () => {
      return client.comments.listThreads.query({
        contentPieceId: props.editedContentPiece.id
      });
    },
    { initialValue: [] }
  );
  const activeThreads = createMemo(() => {
    return threads().filter((thread) => thread && thread.firstComment) as Array<
      Omit<App.CommentThread, "comments"> & { firstComment: App.CommentWithAdditionalData }
    >;
  });

  client.comments.changes.subscribe(
    { contentPieceId: props.editedContentPiece.id },
    {
      onData({ action, data }) {
        switch (action) {
          case "resolveThread":
          case "deleteThread":
            setThreads((threads) => {
              return threads.filter((thread) => thread.id !== data.id);
            });
            break;
        }
      }
    }
  );

  return (
    <Show when={threads().length && !threads.loading}>
      <Dropdown
        activatorButton={() => (
          <IconButton
            path={mdiCommentMultipleOutline}
            label={`${threads().length} thread${threads().length > 1 ? "s" : ""}`}
            variant="text"
            text="soft"
          />
        )}
        cardProps={{
          class: "w-96 p-2 gap-2 mt-2 pr-1"
        }}
      >
        <ScrollShadow scrollableContainerRef={scrollableContainerRef} />
        <div
          class="max-h-[60vh] overflow-y-auto scrollbar-sm flex flex-col pr-1 gap-2"
          ref={setScrollableContainerRef}
        >
          <div class="flex justify-center items-center px-1">
            <Heading level={2}>Comment threads</Heading>
            <div class="flex-1" />
          </div>
          <For each={activeThreads()}>
            {(thread) => {
              return <CommentCard comment={thread.firstComment} />;
            }}
          </For>
        </div>
      </Dropdown>
    </Show>
  );
};

export { CommentThreadsMenu };
