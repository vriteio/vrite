import { createRef } from "@andesine/components";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { type Accessor, type Component, onCleanup, onMount, type Setter, Show } from "solid-js";
import { type useWorkspace } from "#web/context/workspace";
import {
  canOrderCollections,
  canOrderEntries,
  getDraggedCollectionIDs,
  getDraggedEntryIDs
} from "./explorer-dnd";

type WorkspaceContent = ReturnType<typeof useWorkspace>["content"];
interface CollectionBoundaryDropTargetProps {
  type: "collection" | "entry";
  collectionID: string;
  content: WorkspaceContent;
  canDropIntoCollection(source: { data: Record<string | symbol, unknown> }): boolean;
  forcedType: Accessor<"collection" | "entry" | null>;
  setSubtreeDraggedOver: Setter<boolean>;
}

const CollectionBoundaryDropTarget: Component<CollectionBoundaryDropTargetProps> = (props) => {
  const [boundaryRef, setBoundaryRef] = createRef<HTMLElement | null>(null);
  const [isDraggedOver, setIsDraggedOver] = createRef(false);
  const changesParent = (data: Record<string | symbol, unknown>) => {
    if (props.type === "collection") {
      return getDraggedCollectionIDs(data).some(
        (id) =>
          (props.content.collections.get({ collectionID: id })?.ancestors.at(-1) ?? null) !==
          props.collectionID
      );
    }
    return getDraggedEntryIDs(data).some(
      (id) =>
        (props.content.entries.get({ entryID: id })?.collectionID ?? null) !== props.collectionID
    );
  };
  const canDrop = (source: { data: Record<string | symbol, unknown> }) =>
    (props.type === "collection"
      ? canOrderCollections(source.data)
      : canOrderEntries(source.data)) && props.canDropIntoCollection(source);
  const update = (source: { data: Record<string | symbol, unknown> }) => {
    const active = canDrop(source);
    setIsDraggedOver(active);
    props.setSubtreeDraggedOver(active && changesParent(source.data));
  };
  const reset = () => {
    setIsDraggedOver(false);
    props.setSubtreeDraggedOver(false);
  };

  onMount(() => {
    const element = boundaryRef();
    if (!element) return;
    const cleanup = dropTargetForElements({
      element,
      getData: () => ({
        type: props.type === "collection" ? "collection-boundary" : "entry-boundary",
        id: props.collectionID
      }),
      canDrop: ({ source }) => canDrop(source),
      onDragEnter: ({ source }) => update(source),
      onDrag: ({ source }) => update(source),
      onDragLeave: reset,
      onDrop: reset
    });
    onCleanup(cleanup);
  });

  return (
    <div class="relative h-0">
      <div ref={setBoundaryRef} class="absolute inset-x-0 -top-3 h-6 pointer-events-none" />
      <Show when={isDraggedOver() || props.forcedType() === props.type}>
        <div class="flex bg-gradient-to-tr h-2.5px w-full absolute top-[-1.25px] items-center justify-center rounded-full pointer-events-none shadow-[0_0_8px_0] shadow-primary z-10">
          <div class="h-2.25 w-2.25 bg-gradient-to-tr rounded-full -left-1 flex justify-center items-center absolute">
            <div class="h-1 w-1 bg-gray-100 rounded-full" />
          </div>
        </div>
      </Show>
    </div>
  );
};

export { CollectionBoundaryDropTarget };
