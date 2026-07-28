import {
  DragHandlePlugin,
  dragHandlePluginDefaultKey,
  normalizeNestedOptions,
  defaultComputePositionConfig
} from "@tiptap/extension-drag-handle";
import { IconButton } from "@andesine/components";
import { Editor } from "@tiptap/core";
import { Component, createSignal, onCleanup, onMount, Show } from "solid-js";

interface DragHandleMenuProps {
  editor: Editor;
}

const DragHandleMenu: Component<DragHandleMenuProps> = (props) => {
  let wrapperRef: HTMLDivElement | undefined;
  let hoverAreaRef: HTMLDivElement | undefined;
  let currentNodePos = -1;
  let currentMouseX = 0;
  let lastMousePosition: { x: number; y: number } | null = null;
  const [isEmptyParagraph, setIsEmptyParagraph] = createSignal(false);

  const LEFT_THRESHOLD_PERCENT = 0.3; // fraction of node width from left edge within which handle is shown

  onMount(() => {
    if (!wrapperRef) return;

    wrapperRef.style.visibility = "hidden";
    wrapperRef.style.opacity = "0";
    wrapperRef.style.transition = "opacity 0.15s ease, visibility 0.15s ease";
    wrapperRef.style.position = "absolute";
    wrapperRef.remove();
    const editorEl = props.editor.view.dom;
    const handleMouseMoveCapture = (event: MouseEvent) => {
      if (lastMousePosition?.x === event.clientX && lastMousePosition.y === event.clientY) {
        event.stopImmediatePropagation();
        return;
      }

      lastMousePosition = { x: event.clientX, y: event.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      currentMouseX = e.clientX;

      requestAnimationFrame(() => {
        if (!wrapperRef || currentNodePos < 0) return;

        const node = props.editor.state.doc.nodeAt(currentNodePos);
        const domNode = props.editor.view.nodeDOM(currentNodePos);

        if (!(domNode instanceof HTMLElement) || node?.type.name === "title") {
          wrapperRef.style.visibility = "hidden";
          wrapperRef.style.opacity = "0";
          return;
        }

        const nodeRect = domNode.getBoundingClientRect();
        const threshold = nodeRect.width * LEFT_THRESHOLD_PERCENT;
        const distanceFromLeft = currentMouseX - nodeRect.left;

        if (distanceFromLeft > threshold) {
          wrapperRef.style.visibility = "hidden";
          wrapperRef.style.opacity = "0";
        } else {
          if (hoverAreaRef) {
            hoverAreaRef.style.top = `${wrapperRef.offsetHeight}px`;
            hoverAreaRef.style.height = `${Math.max(
              0,
              nodeRect.height - wrapperRef.offsetHeight
            )}px`;
          }

          wrapperRef.style.visibility = "visible";
          wrapperRef.style.opacity = "1";
        }
      });
    };

    editorEl.addEventListener("mousemove", handleMouseMoveCapture, true);
    editorEl.addEventListener("mousemove", handleMouseMove);

    const { plugin, unbind } = DragHandlePlugin({
      pluginKey: dragHandlePluginDefaultKey,
      element: wrapperRef,
      editor: props.editor,
      computePositionConfig: {
        ...defaultComputePositionConfig,
        placement: "left",
        strategy: "absolute"
      },
      onNodeChange: ({ pos, node }) => {
        currentNodePos = pos;

        const isEmpty = node?.type.name === "paragraph" && node.content.size === 0;

        setIsEmptyParagraph(Boolean(isEmpty));

        if (wrapperRef && node?.type.name === "title") {
          wrapperRef.style.visibility = "hidden";
          wrapperRef.style.opacity = "0";
        }
      },
      getReferencedVirtualElement: () => {
        if (currentNodePos < 0) return null;

        const domNode = props.editor.view.nodeDOM(currentNodePos);

        if (!(domNode instanceof HTMLElement)) return null;

        const nodeRect = domNode.getBoundingClientRect();
        const lineHeightStyle = window.getComputedStyle(domNode).lineHeight;
        const parsedLineHeight = Number.parseFloat(lineHeightStyle);
        const lineHeight =
          lineHeightStyle === "normal" || Number.isNaN(parsedLineHeight) ? 24 : parsedLineHeight;
        const referenceRect = new DOMRect(nodeRect.x, nodeRect.y, nodeRect.width, lineHeight);

        return {
          getBoundingClientRect: () => referenceRect
        };
      },
      nestedOptions: normalizeNestedOptions(false)
    });

    props.editor.registerPlugin(plugin);

    onCleanup(() => {
      editorEl.removeEventListener("mousemove", handleMouseMoveCapture, true);
      editorEl.removeEventListener("mousemove", handleMouseMove);
      unbind();
      props.editor.unregisterPlugin(dragHandlePluginDefaultKey);
    });
  });

  return (
    <div class="flex items-center pr-2" ref={wrapperRef} data-drag-handle>
      <div
        class="absolute inset-x-0 pointer-events-auto"
        ref={hoverAreaRef}
        data-drag-handle-hover-area
      />
      <Show when={isEmptyParagraph()}>
        <IconButton
          icon="i-lucide:plus"
          class="bg-gray-50"
          variant="text"
          color="contrast"
          size="small"
          text="soft"
          badge
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (currentNodePos < 0) return;

            props.editor
              .chain()
              .setTextSelection(currentNodePos + 1)
              .insertContent("/")
              .focus()
              .run();
          }}
        />
      </Show>
      <IconButton
        icon="i-lucide:grip-vertical"
        class="bg-gray-50 cursor-grab active:cursor-grabbing"
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
