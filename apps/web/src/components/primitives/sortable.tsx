import { Accessor, Component, createEffect, createSignal, For, JSX, on, Show } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import SortableLib from "sortablejs";

interface SortableProps {
  ids: string[];
  class?: string;
  style?: JSX.CSSProperties;
  fallback?: JSX.Element;
  ghostClass?: string;
  filter?: string;
  disabled?: boolean;
  group?: string;
  sortableId?: string;
  handle?: string;
  dragImage?: Component<{ id: string }>;
  addon?: Component;
  ref?(element: HTMLElement): void;
  onDragStart?(affectedId: string): void;
  onDragChange?(newIds: string[]): void;
  onDragEnd?(
    newIds: string[],
    details: {
      affectedId: string;
      movedOutSortableId: string | null;
      movedOutIds: string[] | null;
      movedInSortableId: string | null;
      movedInIds: string[] | null;
    }
  ): void;
  children(
    id: string,
    index: Accessor<number>,
    dataProps: () => Record<string, string>
  ): JSX.Element;
}

const [draggedId, setDraggedId] = createSignal<string | null>(null);
const [movedOutSortableId, setMovedOutSortableId] = createSignal<string | null>(null);
const [movedInSortableId, setMovedInSortableId] = createSignal<string | null>(null);
const [movedOutIds, setMovedOutIds] = createSignal<string[] | null>(null);
const [movedInIds, setMovedInIds] = createSignal<string[] | null>(null);
const Sortable: Component<SortableProps> = (props) => {
  const [ids, setIds] = createSignal<string[]>([]);
  const [wrapperRef, setWrapperRef] = createSignal<HTMLElement | null>(null);
  const [dragImage, setDragImage] = createSignal<HTMLElement | null>(null);
  const [sortable, setSortable] = createSignal<SortableLib | null>(null);
  const ref = (element: HTMLElement): void => {
    props.ref?.(element);
    setWrapperRef(() => element);
  };

  createEffect(
    on(
      [
        wrapperRef,
        () => props.ghostClass,
        () => props.filter,
        () => props.disabled,
        () => props.group,
        () => props.sortableId,
        () => props.handle
      ],
      ([wrapperRef, ghostClass, filter, disabled, group, sortableId, handle]) => {
        if (wrapperRef) {
          const currentSortable = sortable();

          if (currentSortable) {
            currentSortable.destroy();
          }

          setSortable(
            SortableLib.create(wrapperRef, {
              onStart(event) {
                const dataIndex = event.item.dataset.index;

                if (dataIndex) {
                  setDraggedId(() => ids()[parseInt(dataIndex)] || null);
                }

                if (draggedId()) props.onDragStart?.(draggedId()!);
              },
              setData(dataTransfer, draggedElement) {
                if (!props.dragImage) return;

                const draggedId = draggedElement.dataset.id || "";
                const element = document.createElement("div")!;

                element.setAttribute("class", "fixed left-[9999px] top-[9999px]");
                render(() => <Dynamic component={props.dragImage} id={draggedId} />, element);
                document.body.appendChild(element);

                const rect = element.getBoundingClientRect();

                dataTransfer?.setDragImage(element, rect.width / 2, rect.height / 2);
              },
              onChange() {
                const children = [...(wrapperRef.children || [])] as HTMLElement[];
                const newIds = children
                  .map((element) => {
                    return ids().find((id) => id === element.dataset.id!);
                  })
                  .filter(Boolean) as string[];

                children.sort((a, b) => parseInt(a.dataset.index!) - parseInt(b.dataset.index!));
                wrapperRef.replaceChildren(...children);

                if (draggedId()) {
                  props.onDragChange?.(newIds);
                }

                setIds(newIds);
              },
              onAdd(event) {
                const children = [...(event.to?.children || [])] as HTMLElement[];
                const newIds = children
                  .map((element) => {
                    return ids().find((id) => id === element.dataset.id!) || draggedId();
                  })
                  .filter(Boolean) as string[];

                children.splice(event.newIndex!, 1);
                event.to?.replaceChildren(...children);

                if (sortableId) {
                  setMovedInSortableId(sortableId!);
                  setMovedInIds(newIds);
                }

                setIds(newIds);
              },
              onRemove(event) {
                const children = [...(event.from?.children || [])] as HTMLElement[];
                const newIds = children
                  .map((element) => {
                    return ids().find((id) => id === element.dataset.id!);
                  })
                  .filter(Boolean) as string[];

                children.splice(event.oldIndex!, 0, event.item);
                event.from.replaceChildren(...children);

                if (sortableId) {
                  setMovedOutSortableId(sortableId!);
                  setMovedOutIds(newIds);
                }

                setIds(newIds);
              },
              onEnd() {
                const children = [...(wrapperRef.children || [])] as HTMLElement[];
                const newIds = children
                  .map((element) => {
                    return ids().find((id) => id === element.dataset.id!);
                  })
                  .filter(Boolean) as string[];

                children.sort((a, b) => parseInt(a.dataset.index!) - parseInt(b.dataset.index!));
                wrapperRef.replaceChildren(...children);

                if (draggedId()) {
                  props.onDragEnd?.(newIds, {
                    affectedId: draggedId()!,
                    movedOutSortableId: movedOutSortableId(),
                    movedInSortableId: movedInSortableId(),
                    movedOutIds: movedOutIds(),
                    movedInIds: movedInIds()
                  });
                }

                dragImage()?.remove();
                setIds(newIds);
                setDraggedId(null);
                setMovedInIds(null);
                setMovedOutIds(null);
                setMovedOutSortableId(null);
                setMovedInSortableId(null);
                setDragImage(null);
              },
              onMove(event) {
                if (!filter) return true;

                return !event.related.matches(filter);
              },
              fallbackOnBody: true,
              delayOnTouchOnly: true,
              delay: 500,
              ghostClass,
              disabled,
              handle,
              filter,
              group
            })
          );
        }
      }
    )
  );
  createEffect(() => {
    setIds(props.ids);
  });

  return (
    <div class={props.class} style={props.style} ref={ref}>
      <For each={ids()} fallback={props.fallback}>
        {(id, index) => {
          return props.children(id, index, () => ({
            "data-id": id,
            "data-index": `${index()}`
          }));
        }}
      </For>
      <Show when={props.addon}>
        <Dynamic component={props.addon} />
      </Show>
    </div>
  );
};

export { Sortable };
