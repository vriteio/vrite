import { IconButton } from "@andesine/components";
import { type Editor } from "@tiptap/core";
import { type Accessor, type Component, createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  getBlockControlAnchorRect,
  getBlockControlTargetAtY,
  getBlockSelectionTopTarget,
  getCachedElementRect,
  getEditorScrollContainer,
  isPointInBlockSelectionControlArea,
  isPointInBlockControlArea,
  isTargetInBlockSelection,
  registerSelectionControlHiding
} from "#editor/ui/block-control-targeting";
import type { BlockControlTarget } from "#editor/ui/block-control-targeting";
import { createVerticalAutoScroll } from "#editor/ui/auto-scroll";
import { EDITOR_MENU_Z_INDEX } from "#editor/ui/constants";
import { createDragHandlePlugin, dragHandlePluginKey } from "./drag-handle-plugin";
import { createListItemTargetResolver } from "./list-item-target";
import { DragHandleTargetPlugin, dragHandleTargetPluginKey } from "./drag-handle-target-plugin";

interface DragHandleMenuProps {
  editor: Editor;
  menuContainerRef: Accessor<HTMLElement | null>;
}

// Active drags stay visible; otherwise the pointer must resolve to a non-title block.
const shouldShowDragHandle = (
  available: boolean,
  dragging: boolean,
  target: BlockControlTarget | null
): boolean => dragging || Boolean(available && target && target.node.type.name !== "title");

const DragHandleMenu: Component<DragHandleMenuProps> = (props) => {
  let wrapperRef: HTMLDivElement | undefined;
  let hoverAreaRef: HTMLDivElement | undefined;
  let pointer = { x: 0, y: 0 };
  let dragStarting = false;
  let dragHandleAvailable = false;
  let currentControlTarget: BlockControlTarget | null = null;
  let decoratedHeadingTargetPos: number | null = null;
  const [isEmptyParagraph, setIsEmptyParagraph] = createSignal(false);

  onMount(() => {
    if (!wrapperRef) return;

    wrapperRef.style.visibility = "hidden";
    wrapperRef.style.opacity = "0";
    wrapperRef.style.position = "absolute";
    wrapperRef.remove();
    const scrollContainer = getEditorScrollContainer(props.editor);
    const autoScroll = createVerticalAutoScroll(() => scrollContainer);
    const isDragging = () => dragStarting || wrapperRef.dataset.dragging === "true";
    const handleDragOver = (event: DragEvent) => {
      if (isDragging()) autoScroll.update(event);
    };
    const stopAutoScroll = () => autoScroll.stop();
    const updateHeadingIndicator = (visible: boolean) => {
      const target = currentControlTarget;
      const nextTargetPos = visible && target?.node.type.name === "heading" ? target.pos : null;

      if (nextTargetPos === decoratedHeadingTargetPos) return;

      decoratedHeadingTargetPos = nextTargetPos;
      props.editor.view.dispatch(
        props.editor.state.tr.setMeta(dragHandleTargetPluginKey, { pos: nextTargetPos })
      );
    };
    const updateDragHandleVisibility = () => {
      const visible = shouldShowDragHandle(dragHandleAvailable, isDragging(), currentControlTarget);

      wrapperRef.style.visibility = visible ? "visible" : "hidden";
      wrapperRef.style.opacity = visible ? "1" : "0";
      wrapperRef.style.pointerEvents = visible ? "auto" : "none";
      updateHeadingIndicator(visible);
    };
    const setDragHandleAvailable = (available: boolean) => {
      dragHandleAvailable = available;
      updateDragHandleVisibility();
    };

    const listItemTargetResolver = createListItemTargetResolver(props.editor, () => pointer.y);
    const setCurrentTarget = (
      source: BlockControlTarget | null,
      selection = getBlockSelectionTopTarget(props.editor)
    ) => {
      const usesSelection = Boolean(
        selection && source && isTargetInBlockSelection(props.editor, source)
      );
      const target = usesSelection ? selection : source;

      currentControlTarget = target;
      setIsEmptyParagraph(
        Boolean(
          !usesSelection && source?.node.type.name === "paragraph" && source.node.content.size === 0
        )
      );

      return target;
    };
    const isPointerTargetAvailable = (
      target: BlockControlTarget | null
    ): target is BlockControlTarget =>
      Boolean(
        target &&
        isPointInBlockControlArea(props.editor, target, {
          x: pointer.x,
          y: pointer.y,
          side: "left"
        })
      );
    const isPointerInBlockSelectionArea = () => {
      return isPointInBlockSelectionControlArea(props.editor, {
        ...pointer,
        side: "left"
      });
    };
    const positionDragHandle = (target: BlockControlTarget) => {
      const menuContainer = props.menuContainerRef();

      if (!menuContainer) return;

      const referenceRect = getBlockControlAnchorRect(props.editor, target);
      const menuContainerRect = getCachedElementRect(props.editor, menuContainer);

      wrapperRef.style.left = `${referenceRect.left - menuContainerRect.left - wrapperRef.offsetWidth}px`;
      wrapperRef.style.top = `${
        referenceRect.top -
        menuContainerRect.top +
        (referenceRect.height - wrapperRef.offsetHeight) / 2
      }px`;
    };
    let pointerFrame: number | null = null;
    let pendingPointer: { x: number; y: number } | null = null;
    const handlePointerMove = (event: PointerEvent) => {
      pendingPointer = { x: event.clientX, y: event.clientY };

      if (pointerFrame !== null) return;

      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = null;
        const nextPointer = pendingPointer;

        pendingPointer = null;
        if (!nextPointer) return;

        pointer = nextPointer;

        if (!props.editor.isEditable) {
          setDragHandleAvailable(false);
          return;
        }

        const pointerTarget = listItemTargetResolver.resolve(
          getBlockControlTargetAtY(props.editor, pointer.y)
        );
        const selectionTarget = getBlockSelectionTopTarget(props.editor);
        const pointerInSelectionArea = Boolean(selectionTarget && isPointerInBlockSelectionArea());
        const effectivePointerTarget = pointerInSelectionArea ? selectionTarget : pointerTarget;
        const target = setCurrentTarget(effectivePointerTarget, selectionTarget);

        // A block selection forms one continuous hover area, including gaps between blocks.
        if (
          !target ||
          (!pointerInSelectionArea && !isPointerTargetAvailable(effectivePointerTarget))
        ) {
          setDragHandleAvailable(false);
          return;
        }

        const nodeRect =
          target.node.type.name === "fragment"
            ? getBlockControlAnchorRect(props.editor, target)
            : getCachedElementRect(props.editor, target.dom);
        positionDragHandle(target);

        if (hoverAreaRef) {
          hoverAreaRef.style.top = `${wrapperRef.offsetHeight}px`;
          hoverAreaRef.style.height = `${Math.max(0, nodeRect.height - wrapperRef.offsetHeight)}px`;
        }

        setDragHandleAvailable(true);
      });
    };
    const handlePointerLeave = () => {
      // Active drags retain the handle after the pointer leaves the editor.
      if (isDragging()) return;

      setDragHandleAvailable(false);
    };

    scrollContainer?.addEventListener("pointermove", handlePointerMove);
    scrollContainer?.addEventListener("pointerleave", handlePointerLeave);
    window.addEventListener("dragover", handleDragOver);
    window.addEventListener("dragend", stopAutoScroll);
    window.addEventListener("drop", stopAutoScroll);

    const { plugin, unbind } = createDragHandlePlugin({
      element: wrapperRef,
      editor: props.editor,
      getDragTarget: () => currentControlTarget,
      onDragStart: () => {
        dragStarting = true;
        updateDragHandleVisibility();
      },
      onDragEnd: () => {
        dragStarting = false;
        autoScroll.stop();
        setDragHandleAvailable(false);
      }
    });

    props.editor.registerPlugin(DragHandleTargetPlugin());
    props.editor.registerPlugin(plugin);
    const pluginWrapper = wrapperRef.parentElement;
    const menuContainer = props.menuContainerRef();

    if (pluginWrapper && menuContainer) {
      pluginWrapper.style.zIndex = String(EDITOR_MENU_Z_INDEX.dragHandle);
      menuContainer.append(pluginWrapper);
    }
    const unregisterSelectionHandler = registerSelectionControlHiding(props.editor, () => {
      if (isDragging()) return;

      setCurrentTarget(null, null);
      setDragHandleAvailable(false);
      listItemTargetResolver.reset();
      props.editor.commands.setMeta("hideDragHandle", true);
    });

    onCleanup(() => {
      if (pointerFrame !== null) cancelAnimationFrame(pointerFrame);
      scrollContainer?.removeEventListener("pointermove", handlePointerMove);
      scrollContainer?.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("dragover", handleDragOver);
      window.removeEventListener("dragend", stopAutoScroll);
      window.removeEventListener("drop", stopAutoScroll);
      autoScroll.stop();
      unbind();
      unregisterSelectionHandler();
      props.editor.unregisterPlugin(dragHandlePluginKey);
      props.editor.unregisterPlugin(dragHandleTargetPluginKey);
    });
  });

  return (
    <div
      class="flex items-center pr-2"
      ref={wrapperRef}
      data-drag-handle
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        class="absolute inset-x-0 pointer-events-auto"
        ref={hoverAreaRef}
        data-drag-handle-hover-area
      />
      <Show when={isEmptyParagraph()}>
        <IconButton
          icon="i-lucide:plus"
          variant="text"
          color="contrast"
          size="small"
          text="soft"
          badge
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            const pos = currentControlTarget?.pos;

            if (pos === undefined) return;

            props.editor
              .chain()
              .setTextSelection(pos + 1)
              .insertContent("/")
              .focus()
              .run();
          }}
        />
      </Show>
      <IconButton
        icon="i-lucide:grip-vertical"
        class="cursor-grab active:cursor-grabbing"
        variant="text"
        color="contrast"
        size="small"
        text="soft"
        badge
      />
    </div>
  );
};

export { DragHandleMenu };
