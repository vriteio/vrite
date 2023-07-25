import {
  mdiHexagonSlice6,
  mdiChevronRight,
  mdiFolder,
  mdiChevronDoubleRight,
  mdiFolderLock
} from "@mdi/js";
import { Component, createSignal, createEffect, on, Show, For, createMemo, JSX } from "solid-js";
import Sortable from "sortablejs";
import { IconButton } from "#components/primitives";
import { useContentGroups } from "#lib/composables";
import { App, useClient, useCache } from "#context";

const Breadcrumb: Component<{
  ancestor?: App.ContentGroup | null;
  activeDraggableGroup?: App.ContentGroup | null;
  setAncestor?(contentGroup: App.ContentGroup | null): void;
}> = (props) => {
  const client = useClient();
  const cache = useCache();
  const { contentGroups, setContentGroups } = cache("contentGroups", () => useContentGroups());
  const [highlightedAncestor, setHighlightedAncestor] = createSignal("");
  const [ancestors, setAncestors] = createSignal<App.ContentGroup[]>([]);
  const highlightDropzoneHandlers = (
    ancestorId: string
  ): JSX.CustomEventHandlersCamelCase<HTMLElement> => ({
    onDragOver(event) {
      event.preventDefault();
    },
    onDragEnter(event) {
      if (
        props.activeDraggableGroup &&
        props.activeDraggableGroup.ancestors.at(-1) !== ancestorId &&
        event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget)
      ) {
        setHighlightedAncestor(ancestorId);
      }
    },
    onDragLeave(event) {
      if (
        props.activeDraggableGroup &&
        props.activeDraggableGroup.ancestors.at(-1) !== ancestorId &&
        event.relatedTarget instanceof Node &&
        !event.currentTarget.contains(event.relatedTarget)
      ) {
        setHighlightedAncestor("");
      }
    },
    onMouseEnter() {
      if (
        props.activeDraggableGroup &&
        props.activeDraggableGroup.ancestors.at(-1) !== ancestorId
      ) {
        setHighlightedAncestor(ancestorId);
      }
    },
    onMouseLeave() {
      if (
        props.activeDraggableGroup &&
        props.activeDraggableGroup.ancestors.at(-1) !== ancestorId
      ) {
        setHighlightedAncestor("");
      }
    },
    onTouchMove(event) {
      if (
        props.activeDraggableGroup &&
        props.activeDraggableGroup.ancestors.at(-1) !== ancestorId
      ) {
        const x = event.touches[0].clientX;
        const y = event.touches[0].clientY;
        const elementAtTouchPoint = document.elementFromPoint(x, y);

        if (
          elementAtTouchPoint === event.target ||
          elementAtTouchPoint?.parentNode === event.target
        ) {
          setHighlightedAncestor(ancestorId);
        } else {
          setHighlightedAncestor("");
        }
      }
    }
  });
  const renderedAncestors = createMemo(() => {
    return ancestors().slice(-3);
  });

  createEffect(
    on(
      () => props.ancestor,
      async (ancestor) => {
        if (ancestor) {
          const ancestors = await client.contentGroups.listAncestors.query({
            contentGroupId: ancestor.id || ""
          });

          setAncestors([...ancestors, ancestor]);
        } else {
          setAncestors([]);
        }
      }
    )
  );

  return (
    <div class="hidden md:flex bg-gray-200 dark:bg-gray-900 rounded-lg">
      <Show when={props.ancestor && props.setAncestor && ancestors().length}>
        <div
          ref={(el) => {
            Sortable.create(el, {
              group: "shared",
              ghostClass: "!hidden",
              filter: ".locked",
              onAdd(evt) {
                const el = evt.item;

                el.remove();
                setHighlightedAncestor("");
                client.contentGroups.move.mutate({
                  id: el.dataset.contentGroupId || "",
                  ancestor: ancestors().length > 3 ? ancestors()[ancestors().length - 4].id : null
                });
                setContentGroups(
                  contentGroups().filter(
                    (contentGroup) => contentGroup.id !== el.dataset.contentGroupId
                  )
                );
              }
            });
          }}
        >
          <IconButton
            path={ancestors().length > 3 ? mdiChevronDoubleRight : mdiHexagonSlice6}
            variant={highlightedAncestor() === "base" ? "solid" : "text"}
            text={highlightedAncestor() === "base" ? "primary" : "soft"}
            color={highlightedAncestor() === "base" ? "primary" : "base"}
            class="m-0 locked"
            onClick={() => {
              if (ancestors().length > 3) {
                props.setAncestor!(ancestors()[ancestors().length - 4]);
              } else {
                props.setAncestor!(null);
              }
            }}
            {...highlightDropzoneHandlers(
              ancestors().length > 3 ? ancestors()[ancestors().length - 4].id : "base"
            )}
          />
        </div>
        <For each={renderedAncestors()}>
          {(ancestor, index) => (
            <>
              <Show when={index() !== 0 || ancestors().length <= 3}>
                <IconButton
                  path={mdiChevronRight}
                  variant="text"
                  text="soft"
                  class="m-0 p-0"
                  badge
                  hover={false}
                />
              </Show>
              <div
                ref={(el) => {
                  if (props.ancestor?.id === ancestor.id) return;

                  Sortable.create(el, {
                    group: "shared",
                    ghostClass: "!hidden",
                    filter: ".locked",
                    onAdd(evt) {
                      const el = evt.item;

                      el.remove();
                      setHighlightedAncestor("");
                      client.contentGroups.move.mutate({
                        id: el.dataset.contentGroupId || "",
                        ancestor: ancestor.id
                      });
                      setContentGroups(
                        contentGroups().filter(
                          (contentGroup) => contentGroup.id !== el.dataset.contentGroupId
                        )
                      );
                    }
                  });
                }}
              >
                <IconButton
                  variant={highlightedAncestor() === ancestor.id ? "solid" : "text"}
                  text={highlightedAncestor() === ancestor.id ? "primary" : "soft"}
                  color={highlightedAncestor() === ancestor.id ? "primary" : "base"}
                  class="m-0 locked"
                  path={ancestor.locked ? mdiFolderLock : mdiFolder}
                  label={ancestor.name}
                  onClick={() => props.setAncestor!(ancestor)}
                  {...highlightDropzoneHandlers(ancestor.id)}
                ></IconButton>
              </div>
            </>
          )}
        </For>
      </Show>
    </div>
  );
};

export { Breadcrumb };
