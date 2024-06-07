import { CommentThread } from "./comment-thread";
import { CommentDataProvider } from "./comment-data";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import { Component, For, createEffect, createSignal, on, onCleanup, onMount } from "solid-js";
import { createStore } from "solid-js/store";
import { useContentData, useLocalStorage } from "#context";

interface BlockActionMenuProps {
  state: {
    editor: SolidEditor;
    contentOverlap: boolean;
    fragment: string;
    setFragment(fragment: string): void;
    updatePosition(): void;
  };
}
interface CommentFragmentData {
  id: string;
  top: number;
  computedTop: number;
  overlap: number;
  pos: number;
}

const CommentMenu: Component<BlockActionMenuProps> = (props) => {
  const { storage } = useLocalStorage();
  const { activeContentPieceId } = useContentData();
  const [fragments, setFragments] = createStore<Record<string, CommentFragmentData | undefined>>(
    {}
  );
  const [fragmentIds, setFragmentIds] = createSignal<string[]>([]);
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
        const top = coords.top - (parentPos?.top || 0) + 16;
        const newFragment = {
          top,
          computedTop: previousFragment ? Math.max(previousFragment.computedTop + 104, top) : top,
          id: fragmentId,
          overlap: 0,
          pos: pos + node.nodeSize
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

    setFragmentIds(newFragmentIds);
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
    <CommentDataProvider contentPieceId={activeContentPieceId() || ""}>
      <div
        class={clsx(
          "hidden md:block not-prose text-base w-80 m-0 transform max-h-[60vh] backdrop-blur-lg bg-gray-100 dark:bg-gray-800 dark:bg-opacity-50 bg-opacity-50 rounded-l-2xl",
          props.state.contentOverlap && !props.state.fragment && "!hidden",
          props.state.fragment && "z-10 -translate-x-0"
        )}
      >
        <For each={fragmentIds()}>
          {(fragmentId) => {
            return (
              <CommentThread
                fragment={fragments[fragmentId]!}
                contentOverlap={props.state.contentOverlap}
                selectedFragmentId={props.state.fragment}
                contentPieceId={activeContentPieceId() || ""}
                editor={props.state.editor}
                setFragment={props.state.setFragment}
              />
            );
          }}
        </For>
      </div>
    </CommentDataProvider>
  );
};

export { CommentMenu };
