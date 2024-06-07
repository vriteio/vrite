import { CommentCard, CommentWithMember } from "./comment-card";
import { CommentInput } from "./comment-input";
import { ThreadWithFirstComment, useCommentData } from "./comment-data";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, createSignal, createEffect, on, Show, For, createMemo } from "solid-js";
import { mdiCheckCircleOutline, mdiCloseCircle } from "@mdi/js";
import { createRef } from "@vrite/components/src/ref";
import { Button, Card, Heading, IconButton, Loader } from "#components/primitives";
import { App, useClient } from "#context";
import { ScrollShadow } from "#components/fragments";

interface CommentFragmentData {
  id: string;
  overlap: number;
  pos: number;
  top: number;
  computedTop: number;
}

const CommentThread: Component<{
  fragment: CommentFragmentData;
  selectedFragmentId: string | null;
  editor: SolidEditor;
  contentPieceId: string;
  contentOverlap: boolean;
  setFragment(fragment: string): void;
}> = (props) => {
  const client = useClient();
  const { subscribeToUpdates, getThreadByFragment } = useCommentData();
  const [resolving, setResolving] = createSignal(false);
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLDivElement | null>(
    null
  );
  const [loading, setLoading] = createSignal(true);
  const [comments, setComments] = createSignal<
    Array<Omit<App.Comment, "memberId"> & { member: App.CommentMember | null }>
  >([]);
  const selected = (): boolean => props.selectedFragmentId === props.fragment.id;
  const top = createMemo(() => {
    return props.contentOverlap || selected() ? props.fragment.top : props.fragment.computedTop;
  });
  const loadComments = async (): Promise<void> => {
    setLoading(true);

    try {
      const comments = await client.comments.listComments.query({
        fragment: props.fragment.id
      });

      setComments(comments);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };
  const thread = (): ThreadWithFirstComment | null => getThreadByFragment(props.fragment.id);
  const firstComment = (): CommentWithMember => comments()[0];
  const latterComments = (): CommentWithMember[] => comments().slice(1);

  createEffect(
    on(thread, (thread, previousThread) => {
      if (thread?.id !== previousThread?.id) {
        loadComments();
      }
    })
  );
  subscribeToUpdates(({ action, data }) => {
    if (action === "createComment" && data.threadId === thread()?.id) {
      setComments((comments) => [...comments, data]);
    } else if (action === "deleteComment") {
      setComments((comments) => {
        return comments.filter((comment) => comment.id !== data.id);
      });
    }
  });

  return (
    <div
      class={clsx(
        "absolute rounded-2xl flex flex-col gap-2 transform transition-transform",
        props.selectedFragmentId && !selected() && "opacity-40 scale-90 z-0",
        props.contentOverlap && props.selectedFragmentId && !selected() && "!hidden",
        props.selectedFragmentId &&
          selected() &&
          "z-1 hidden md:block not-prose text-base w-86 m-0 transform min-h-[60vh] max-h-[60vh] bg-gray-100 dark:bg-gray-800 dark:bg-opacity-50 bg-opacity-80 rounded-l-2xl"
      )}
      style={{
        top: `${top()}px`,
        right: "0px",
        width: "100%"
      }}
      onClick={() => {
        props.setFragment(props.fragment.id);
      }}
    >
      <Show when={selected()}>
        <div class="flex justify-center items-center absolute w-full px-3 -top-9 backdrop:blur-sm rounded-2xl">
          <IconButton
            path={mdiCloseCircle}
            class="m-0 mr-1 p-0.5"
            variant="text"
            onClick={() => {
              props.setFragment("");
            }}
          />
          <Heading level={2}>Comments</Heading>
          <div class="flex-1" />
          <Show
            when={!resolving() && !loading()}
            fallback={
              <Button
                class="flex justify-center items-center m-0 p-1"
                variant="text"
                text="soft"
                badge
              >
                <Loader class="h-5 w-5 mr-2" />
                <span>Loading</span>
              </Button>
            }
          >
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

                const threadFragment = props.selectedFragmentId;

                if (!threadFragment) return;

                await client.comments.resolveThread.mutate({
                  fragment: threadFragment
                });
                props.editor
                  .chain()
                  .setTextSelection(props.fragment.pos)
                  .extendMarkRange("comment")
                  .focus()
                  .unsetComment()
                  .run();
                setResolving(false);
              }}
            />
          </Show>
        </div>
      </Show>
      <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
      <div class="flex relative justify-center items-center w-full">
        <div
          class="overflow-y-auto h-full w-full scrollbar-sm-contrast max-h-[60vh] flex flex-col gap-2 p-2"
          ref={setScrollableContainerRef}
        >
          <Show
            when={firstComment()}
            fallback={
              <Show when={!selected()}>
                <Card class="m-0 min-h-24 flex justify-center items-center cursor-pointer">
                  <Button badge loading={loading()} variant="text" text="soft" hover={false}>
                    Start discussion
                  </Button>
                </Card>
              </Show>
            }
          >
            <CommentCard comment={firstComment()!} class={clsx(!selected() && "cursor-pointer")} />
          </Show>
          <Show when={!loading() && selected()}>
            <For each={latterComments()}>
              {(comment) => {
                return <CommentCard comment={comment} />;
              }}
            </For>
            <CommentInput thread={thread()} />
          </Show>
        </div>
        <Show when={!loading() && !selected() && latterComments().length}>
          <div
            class="border-2 border-t-0 bg-gray-50 absolute -bottom-3 w-[calc(100%-2rem)] text-center text-xs text-gray-500 dark:text-gray-400 rounded-b-xl -z-1 pt-1"
            style={{ "mask-image": "linear-gradient(to bottom, black, transparent)" }}
          >
            +{latterComments().length} Comment{comments().length > 1 ? "s" : ""}
          </div>
        </Show>
      </div>
    </div>
  );
};

export { CommentThread };
