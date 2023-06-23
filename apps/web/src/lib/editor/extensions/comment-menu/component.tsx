import { MiniEditor, ScrollShadow } from "#components/fragments";
import { Card, Heading, IconButton, Loader, Tooltip } from "#components/primitives";
import { useAuthenticatedContext, useClientContext, useUIContext } from "#context";
import { createRef } from "#lib/utils";
import { mdiCheckCircleOutline, mdiSendOutline } from "@mdi/js";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import dayjs from "dayjs";
import { Component, For, Show, createResource, createSignal } from "solid-js";
import RelativeTimePlugin from "dayjs/plugin/relativeTime";
import { CommentCard } from "./comment-card";

interface BlockActionMenuProps {
  state: {
    editor: SolidEditor;
  };
}

dayjs.extend(RelativeTimePlugin);
const CommentMenu: Component<BlockActionMenuProps> = (props) => {
  const { references } = useUIContext();
  const { membership } = useAuthenticatedContext();
  const { client } = useClientContext();
  const [clearCommentEditorRef, setClearCommentEditorRef] = createRef<() => void>(() => {});
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLDivElement | null>(
    null
  );
  const [selectedThreadFragment, setSelectedThreadFragment] = createSignal<string | null>(null);
  const [currentContent, setCurrentContent] = createSignal("");
  const [sending, setSending] = createSignal(false);
  const [resolving, setResolving] = createSignal(false);
  const [thread, { mutate: setThread }] = createResource(
    selectedThreadFragment,
    () => {
      const threadFragment = selectedThreadFragment();

      if (!threadFragment) return null;

      return client.comments.getThread.query({
        fragment: threadFragment
      });
    },
    { initialValue: null }
  );
  const [comments, { mutate: setComments }] = createResource(
    selectedThreadFragment,
    () => {
      const threadFragment = selectedThreadFragment();

      if (!threadFragment) return [];

      return client.comments.listComments.query({
        fragment: threadFragment
      });
    },
    { initialValue: [] }
  );

  props.state.editor.on("selectionUpdate", () => {
    if (props.state.editor.isActive("comment")) {
      setSelectedThreadFragment(props.state.editor.getAttributes("comment").thread);
    } else {
      setSelectedThreadFragment(null);
    }
  });
  props.state.editor.on("update", () => {
    if (props.state.editor.isActive("comment")) {
      setSelectedThreadFragment(props.state.editor.getAttributes("comment").thread);
    } else {
      setSelectedThreadFragment(null);
    }
  });
  client.comments.changes.subscribe(
    { contentPieceId: references.editedContentPiece!.id },
    {
      onData({ action, data }) {
        if (action === "createComment" && data.threadId === thread()?.id) {
          setComments((comments) => [...comments, data]);
        } else if (action === "resolveThread" && data.id === thread()?.id) {
          setThread((thread) => {
            if (!thread) return null;

            return {
              ...thread,
              resolved: true
            };
          });
        }
      }
    }
  );

  return (
    <div
      class={clsx(
        "not-prose text-base w-96 m-0 transform transition-all max-h-[60vh] overflow-hidden backdrop-blur-lg bg-gray-100 dark:bg-gray-800 dark:bg-opacity-50 bg-opacity-50 rounded-l-2xl",
        props.state.editor.isEditable && selectedThreadFragment() ? "z-10 -translate-x-0" : "hidden"
      )}
    >
      <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
      <div
        class="overflow-y-auto h-full scrollbar-sm-contrast max-h-[60vh] flex flex-col gap-2 p-2"
        ref={setScrollableContainerRef}
      >
        <div class="flex justify-center items-center px-1">
          <Heading level={2}>Comments</Heading>
          <div class="flex-1" />
          <IconButton
            class="m-0"
            path={mdiCheckCircleOutline}
            label={thread()?.resolved ? "Resolved" : "Resolve"}
            badge={thread()?.resolved}
            hover={!thread()?.resolved}
            variant="text"
            color={thread()?.resolved ? "primary" : "base"}
            text={thread()?.resolved ? "base" : "soft"}
            onClick={async () => {
              setResolving(true);

              const threadFragment = selectedThreadFragment();

              if (!threadFragment) return;

              await client.comments.resolveThread.mutate({
                fragment: threadFragment
              });

              setCurrentContent("");
              clearCommentEditorRef()();
              props.state.editor.chain().extendMarkRange("comment").focus().unsetComment().run();
              setResolving(false);
            }}
          />
        </div>
        <Show
          when={!comments.loading}
          fallback={
            <Card class="flex justify-center items-center h-24 m-0">
              <Loader />
            </Card>
          }
        >
          <For each={comments()}>
            {(comment) => {
              return <CommentCard comment={comment} />;
            }}
          </For>
          <div class={clsx("relative", thread()?.resolved && "hidden")}>
            <MiniEditor
              class="flex-1 min-h-24 border-gray-200 bg-gray-50 dark:bg-gray-900 dark:border-gray-700 px-3 pt-2 pb-12 border-2 rounded-2xl"
              placeholder="Write here..."
              initialValue=""
              inline
              onUpdate={(editor) => {
                setCurrentContent(editor.getHTML());
                setClearCommentEditorRef(() => editor.commands.clearContent());
              }}
            />
            <Tooltip text="Send" fixed class="mt-1" wrapperClass="bottom-3 right-3 absolute">
              <IconButton
                class="m-0"
                color="primary"
                variant="text"
                path={mdiSendOutline}
                loading={sending()}
                disabled={!currentContent() || currentContent() === "<p></p>"}
                onClick={async () => {
                  setSending(true);

                  const threadFragment = selectedThreadFragment();
                  const memberId = membership()?.id;

                  if (!threadFragment || !memberId) return;

                  await client.comments.createComment.mutate({
                    content: currentContent(),
                    fragment: threadFragment,
                    memberId
                  });

                  setCurrentContent("");
                  clearCommentEditorRef()();
                  setSending(false);
                }}
                text="base"
              />
            </Tooltip>
          </div>
        </Show>
      </div>
    </div>
  );
};

export { CommentMenu };
