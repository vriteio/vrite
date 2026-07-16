import { ParentComponent, onMount, onCleanup } from "solid-js";
import { useTree } from "./tree-context";
import { createRef } from "@andesine/components";

const TreeRoot: ParentComponent = (props) => {
  const [rootRef, setRootRef] = createRef<HTMLDivElement | undefined>(undefined);
  const [, { setSelection }] = useTree();

  onMount(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      const isTreeInteraction =
        target instanceof Element && Boolean(target.closest("[data-tree-item], [role='menu']"));

      if (!rootRef()?.contains(target as Node) || !isTreeInteraction) {
        setSelection([]);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    onCleanup(() => document.removeEventListener("pointerdown", handlePointerDown, true));
  });

  return (
    <div ref={setRootRef} class="contents">
      {props.children}
    </div>
  );
};

export { TreeRoot };
