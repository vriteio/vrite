import { CommentThread } from "./comment-thread";
import { CommentDataProvider } from "./comment-data";
import { SolidEditor } from "@vrite/tiptap-solid";
import clsx from "clsx";
import dayjs from "dayjs";
import { Component, For, createEffect, createSignal, on, onCleanup } from "solid-js";
import RelativeTimePlugin from "dayjs/plugin/relativeTime";
import { createStore } from "solid-js/store";
import { useLocalStorage, useSharedState } from "#context";

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

dayjs.extend(RelativeTimePlugin);

const CommentMenu: Component<BlockActionMenuProps> = (props) => {
  const createSharedSignal = useSharedState();
  const { storage } = useLocalStorage();
  const [editedContentPiece] = createSharedSignal("editedContentPiece");
  const [fragments, setFragments] = createSignal<CommentFragmentData[]>([]);
  const handleStateUpdate = (): void => {
    const container = document.getElementById("pm-container");
    const parentPos = container?.getBoundingClientRect();
    const newFragments: CommentFragmentData[] = [];

    props.state.editor.state.doc.descendants((node, pos) => {
      const commentMark = node.marks.find((mark) => mark.type.name === "comment");
      const existingFragments = fragments().map((fragment) => fragment.id);

      if (node.type.name === "text" && commentMark) {
        const fragmentId = commentMark.attrs.thread;
        const existingFragmentIndex = existingFragments.indexOf(fragmentId);
        const coords = props.state.editor.view.coordsAtPos(pos);
        const previousFragment = newFragments[newFragments.length - 1] || null;
        const top = coords.top - (parentPos?.top || 0);
        const newFragment = {
          top,
          computedTop: previousFragment ? Math.max(previousFragment.computedTop + 104, top) : top,
          id: fragmentId,
          overlap: 0,
          pos: pos + node.nodeSize
        };

        if (existingFragmentIndex >= 0) {
          newFragments.push(Object.assign(fragments()[existingFragmentIndex], newFragment));
        } else {
          newFragments.push(newFragment);
        }

        return false;
      }

      return true;
    });
    setFragments(newFragments);
  };

  createEffect(
    on(
      () => storage().sidePanelWidth,
      () => {
        props.state.updatePosition();
      }
    )
  );
  props.state.editor.on("selectionUpdate", handleStateUpdate);
  props.state.editor.on("update", handleStateUpdate);
  onCleanup(() => {
    props.state.editor.off("selectionUpdate", handleStateUpdate);
    props.state.editor.off("update", handleStateUpdate);
  });

  return (
    <CommentDataProvider contentPieceId={editedContentPiece()?.id || ""}>
      <div
        class={clsx(
          "hidden md:block not-prose text-base w-80 m-0 transform max-h-[60vh] backdrop-blur-lg bg-gray-100 dark:bg-gray-800 dark:bg-opacity-50 bg-opacity-50 rounded-l-2xl",
          props.state.contentOverlap && !props.state.fragment && "!hidden",
          props.state.fragment && "z-10 -translate-x-0"
        )}
      >
        <For each={fragments()}>
          {(fragment) => {
            return (
              <CommentThread
                fragment={fragment}
                contentOverlap={props.state.contentOverlap}
                selectedFragmentId={props.state.fragment}
                contentPieceId={editedContentPiece()?.id || ""}
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
