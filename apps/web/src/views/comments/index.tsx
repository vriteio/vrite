import { Component, For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  mdiCheckCircleOutline,
  mdiClose,
  mdiCloseCircle,
  mdiCommentCheckOutline,
  mdiCommentProcessingOutline,
  mdiCommentTextOutline
} from "@mdi/js";
import clsx from "clsx";
import DOMPurify from "dompurify";
import { Button, Card, Heading, IconButton, Loader } from "#components/primitives";
import { useClient, useLocalStorage, useSharedState } from "#context";
import { CommentCard, CommentInput } from "#lib/editor";
import { useCommentData } from "#context/comments";
import { CollapsibleSection, ScrollShadow } from "#components/fragments";
import { createRef } from "#lib/utils";

interface CommentsViewThreadProps {
  fragmentId: string;
}

const CommentViewThread: Component<CommentsViewThreadProps> = (props) => {
  const { useSharedSignal } = useSharedState();
  const client = useClient();
  const [editor] = useSharedSignal("editor");
  const {
    fragments,
    activeFragmentId,
    getThreadByFragment,
    useCommentsInFragment,
    setActiveFragmentId
  } = useCommentData();
  const { comments, loading } = useCommentsInFragment(() => props.fragmentId);
  const [resolving, setResolving] = createSignal(false);
  const fragment = fragments[props.fragmentId];
  const thread = getThreadByFragment(props.fragmentId);

  return (
    <Show when={thread}>
      <div
        class={clsx(
          "flex flex-col gap-2 p-3 rounded-[1.25rem] cursor-pointer relative z-0 border-2 bg-gray-200 dark:bg-gray-900 dark:bg-opacity-40 bg-opacity-40 border-gray-200 dark:border-gray-700 transform transition-transform",
          activeFragmentId() && props.fragmentId !== activeFragmentId() && "opacity-40 scale-95",
          props.fragmentId !== activeFragmentId() && thread?.resolved && "pb-2"
        )}
        onClick={(event) => {
          if (fragment) {
            if (activeFragmentId() === props.fragmentId) return;

            setActiveFragmentId(props.fragmentId);
            event.currentTarget.scrollIntoView({ block: "center" });
            editor()
              ?.chain()
              .setTextSelection({
                from: fragment.pos,
                to: fragment.pos
              })
              .scrollIntoView()
              .focus()
              .blur()
              .run();
          } else if (props.fragmentId) {
            if (activeFragmentId() === props.fragmentId) return;

            setActiveFragmentId(props.fragmentId);
          }
        }}
      >
        <Show when={activeFragmentId() === props.fragmentId}>
          <div class="flex justify-center items-center w-full">
            <IconButton
              path={mdiCloseCircle}
              class="m-0 mr-1 p-0.5"
              variant="text"
              onClick={() => {
                setActiveFragmentId(null);
              }}
            />
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
                label={thread?.resolved ? "Resolved" : "Resolve"}
                badge={thread?.resolved}
                hover={!thread?.resolved}
                variant="text"
                color={thread?.resolved ? "primary" : "base"}
                text={thread?.resolved ? "base" : "soft"}
                onClick={async () => {
                  if (thread?.resolved) return;

                  setResolving(true);

                  const threadFragment = activeFragmentId();

                  if (!threadFragment) return;

                  await client.comments.resolveThread.mutate({
                    fragment: threadFragment
                  });
                  editor()
                    ?.chain()
                    .setTextSelection(fragment!.pos)
                    .extendMarkRange("comment")
                    .focus()
                    .unsetComment()
                    .run();
                  setResolving(false);
                  setActiveFragmentId(null);
                }}
              />
            </Show>
          </div>
        </Show>
        <Show when={thread?.initialContent}>
          <div class="px-1 pt-1 pb-2 prose -my-4 text-gray-500 dark:text-gray-400">
            <blockquote
              class="!pl-3 ![&_*]:m-0.5 ![&_blockquote]:pl-3"
              innerHTML={DOMPurify.sanitize(thread?.initialContent || "<p></p>")}
            ></blockquote>
          </div>
        </Show>
        <Show
          when={!loading()}
          fallback={
            <div class="flex justify-start items-center px-1 gap-2 text-gray-500 dark:text-gray-400">
              <Loader /> Loading comments
            </div>
          }
        >
          <For
            each={comments()}
            fallback={
              <Show
                when={props.fragmentId !== activeFragmentId() && !thread?.resolved}
                fallback={<p class="px-1">No comments</p>}
              >
                <div class="m-0 min-h-18 flex justify-center items-center cursor-pointer">
                  <Button badge loading={loading()} variant="text" text="soft" hover={false}>
                    Start discussion
                  </Button>
                </div>
              </Show>
            }
          >
            {(comment) => {
              return <CommentCard comment={comment} />;
            }}
          </For>
        </Show>
        <Show when={props.fragmentId === activeFragmentId() && !thread?.resolved}>
          <div class="cursor-auto flex flex-col gap-2">
            <CommentInput thread={thread} />
          </div>
        </Show>
        <Show when={props.fragmentId !== activeFragmentId() && thread?.resolved}>
          <div class="flex justify-start">
            <IconButton
              class="m-0"
              path={mdiCheckCircleOutline}
              label="Resolved"
              badge
              hover={false}
              variant="text"
              text="base"
              color="primary"
            />
          </div>
        </Show>
      </div>
    </Show>
  );
};
const CommentsView: Component = () => {
  const { setStorage } = useLocalStorage();
  const { orderedFragmentIds, threads } = useCommentData();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const inactiveThreads = createMemo(() => {
    return threads().filter((thread) => !orderedFragmentIds().includes(thread.fragment));
  });
  const activeThreads = createMemo(() => {
    return threads().filter(
      (thread) => !thread.resolved && orderedFragmentIds().includes(thread.fragment)
    );
  });
  const inactiveUnresolvedThreads = createMemo(() => {
    return inactiveThreads().filter((thread) => !thread.resolved);
  });
  const resolvedThreads = createMemo(() => {
    return threads().filter((thread) => thread.resolved);
  });

  return (
    <div class="relative flex-1 overflow-hidden flex flex-row h-full">
      <div class="overflow-hidden w-full pl-3 flex flex-col">
        <div class={"flex justify-start items-start mb-1 px-2 pr-5 flex-col"}>
          <div class="flex justify-center items-center w-full">
            <IconButton
              path={mdiClose}
              text="soft"
              badge
              class="flex md:hidden mr-2 m-0"
              onClick={() => {
                setStorage((storage) => ({
                  ...storage,
                  rightPanelWidth: 0
                }));
              }}
            />
            <Heading level={1} class="py-1 flex-1">
              Comments
            </Heading>
          </div>
        </div>
        <div class="overflow-hidden relative flex-1 flex flex-col">
          <div
            class="px-1 pr-3 overflow-y-auto scrollbar-sm-contrast pb-5 "
            ref={setScrollableContainerRef}
          >
            <ScrollShadow color="contrast" scrollableContainerRef={scrollableContainerRef} />

            <Show
              when={!threads.loading}
              fallback={
                <For each={[0, 1, 2]}>
                  {(index) => {
                    return (
                      <div
                        class="animate-pulse h-8 w-full flex justify-start items-center gap-2"
                        style={{ "animation-delay": `${index * 500}ms` }}
                      >
                        <div class="bg-black dark:bg-white !bg-opacity-5 h-6 flex-1 rounded-xl"></div>
                        <div class="bg-black dark:bg-white !bg-opacity-5 h-6 w-6 rounded-xl"></div>
                      </div>
                    );
                  }}
                </For>
              }
            >
              <Show when={!threads().length}>
                <Card class="flex flex-col justify-center items-start m-0 px-3.5">
                  <Heading level={3}>No opened threads</Heading>
                  <span class="text-gray-500 dark:text-gray-400">
                    Select some text to add a comment.
                  </span>
                </Card>
              </Show>
              <Show when={activeThreads().length}>
                <CollapsibleSection icon={mdiCommentTextOutline} label="Active threads">
                  <div class="relative flex-1 flex flex-col gap-3 w-full">
                    <For each={activeThreads()}>
                      {(thread) => {
                        return <CommentViewThread fragmentId={thread.fragment} />;
                      }}
                    </For>
                  </div>
                </CollapsibleSection>
                S
              </Show>
              <Show when={inactiveUnresolvedThreads().length}>
                <CollapsibleSection
                  icon={mdiCommentProcessingOutline}
                  label="Inactive threads"
                  defaultOpened={false}
                  mode="remove"
                >
                  <div class="relative flex-1 flex flex-col gap-3 w-full">
                    <For each={inactiveUnresolvedThreads()}>
                      {(thread) => {
                        return <CommentViewThread fragmentId={thread.fragment} />;
                      }}
                    </For>
                  </div>
                </CollapsibleSection>
              </Show>
              <Show when={resolvedThreads().length}>
                <CollapsibleSection
                  icon={mdiCommentCheckOutline}
                  label="Resolved threads"
                  defaultOpened={false}
                  mode="remove"
                >
                  <div class="relative flex-1 flex flex-col gap-3 w-full">
                    <For each={resolvedThreads()}>
                      {(thread) => {
                        return <CommentViewThread fragmentId={thread.fragment} />;
                      }}
                    </For>
                  </div>
                </CollapsibleSection>
              </Show>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CommentsView };
