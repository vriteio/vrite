import { CommentThread } from "./comment-thread";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, For, Show, createEffect, on, onCleanup, onMount } from "solid-js";
import { useContentData, useLocalStorage } from "#context";
import { CommentFragmentData, useCommentData } from "#context/comments";

interface BlockActionMenuProps {
  state: {
    editor: SolidEditor;
    contentOverlap: boolean;
    updatePosition(): void;
  };
}

const CommentMenu: Component<BlockActionMenuProps> = (props) => {
  const { storage } = useLocalStorage();
  const {
    fragments,
    orderedFragmentIds,
    setFragments,
    setOrderedFragmentIds,
    getCommentNumbers,
    activeFragmentId,
    setActiveFragmentId
  } = useCommentData();
  const { activeContentPieceId } = useContentData();
  const handleStateUpdate = (): void => {
    const container = document.getElementById("pm-container");
    const parentPos = container?.getBoundingClientRect();
    const newFragments: CommentFragmentData[] = [];

    props.state.editor.state.doc.descendants((node, pos) => {
      const commentMark = node.marks.find((mark) => mark.type.name === "comment");

      if (node.type.name === "text" && commentMark) {
        const fragmentId = commentMark.attrs.thread;
        const existingNewFragmentIndex = newFragments.findIndex(
          (fragment) => fragment.id === fragmentId
        );
        const coords = props.state.editor.view.coordsAtPos(pos);
        const previousFragment = newFragments[newFragments.length - 1] || null;
        const top = (): number => coords.top - (parentPos?.top || 0) + 16;
        const newFragment = {
          top,
          computedTop: () => {
            if (!previousFragment) return top();

            const previousFragmentCommentsNumber = getCommentNumbers(previousFragment.id || "");

            return Math.max(
              previousFragment.computedTop() + 104 + (previousFragmentCommentsNumber > 1 ? 16 : 0),
              top()
            );
          },
          id: fragmentId,
          overlap: 0,
          pos: pos + node.nodeSize,
          size: node.nodeSize
        };

        if (existingNewFragmentIndex < 0) {
          setFragments(newFragment.id, newFragment);
          newFragments.push(newFragment);
        }

        return false;
      }

      return true;
    });

    const newFragmentIds = newFragments.map((fragment) => fragment.id);

    setOrderedFragmentIds(newFragmentIds);
    Object.keys(fragments).forEach((fragmentId) => {
      if (!newFragmentIds.includes(fragmentId)) {
        setFragments(fragmentId, undefined);
      }
    });
  };

  createEffect(
    on(
      () => storage().sidePanelWidth,
      () => {
        props.state.updatePosition();
      }
    )
  );
  onMount(() => {
    const container = document.getElementById("pm-container");
    const observer = new ResizeObserver(() => {
      handleStateUpdate();
    });

    if (container) {
      observer.observe(container);
    }

    props.state.editor.on("transaction", handleStateUpdate);
    onCleanup(() => {
      observer.disconnect();
      props.state.editor.off("transaction", handleStateUpdate);
    });
  });

  return (
    <Show
      when={(storage().rightPanelWidth || 0) <= 0 || storage().sidePanelRightView !== "comments"}
    >
      <div
        class={clsx(
          "hidden md:block not-prose text-base w-80 m-0 transform max-h-[60vh] backdrop-blur-lg bg-gray-100 dark:bg-gray-800 dark:bg-opacity-50 bg-opacity-50 rounded-l-2xl",
          props.state.contentOverlap && !activeFragmentId() && "!hidden",
          activeFragmentId() && "z-10 -translate-x-0"
        )}
      >
        <For each={orderedFragmentIds()}>
          {(fragmentId) => {
            return (
              <CommentThread
                fragment={fragments[fragmentId]!}
                contentOverlap={props.state.contentOverlap}
                selectedFragmentId={activeFragmentId()}
                contentPieceId={activeContentPieceId() || ""}
                editor={props.state.editor}
                setFragment={setActiveFragmentId}
              />
            );
          }}
        </For>
      </div>
    </Show>
  );
};

export { CommentMenu };
