import {
  mdiTrashCanOutline,
  mdiClose,
  mdiPlus,
  mdiPencil,
  mdiTagCheckOutline,
  mdiTagPlusOutline,
  mdiCheck
} from "@mdi/js";
import { createDebouncedMemoOn } from "@solid-primitives/memo";
import clsx from "clsx";
import {
  Component,
  createSignal,
  createResource,
  createEffect,
  on,
  Show,
  Switch,
  Match,
  For,
  createMemo
} from "solid-js";
import { createStore } from "solid-js/store";
import { App, useClient, useNotifications } from "#context";
import { Heading, IconButton, Input, Tooltip, Icon, Button } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";
import { tagColorClasses } from "#lib/utils";

interface TagsDropdownProps {
  opened: boolean;
  tags: App.Tag[];
  setOpened(opened: boolean): void;
  setTags(tags: App.Tag[]): void;
}

const TagsDropdown: Component<TagsDropdownProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [view, setView] = createSignal<"select" | "create">("select");
  const [scrollableListRef, setScrollableListRef] = createSignal<HTMLElement | null>(null);
  const [creatingTag, setCreatingTag] = createSignal(false);
  const [deletingTag, setDeletingTag] = createSignal(false);
  const [currentTag, setCurrentTag] = createStore<Omit<App.Tag, "id"> & { id?: string }>({
    color: "gray",
    label: ""
  });
  const tagQuery = createMemo(() => {
    return currentTag.label.toLowerCase().replace(/\s/g, "_");
  });
  const [tags] = createResource(
    createDebouncedMemoOn(tagQuery, (value) => value.toLowerCase().replace(/\s/g, "_"), 250),
    async (query) => {
      return client.tags.search.query({
        query
      });
    }
  );
  const switchTag = async (tag: App.Tag): Promise<void> => {
    if (props.tags.find(({ id }) => id === tag.id)) {
      props.setTags(props.tags.filter(({ id }) => id !== tag.id));
    } else {
      props.setTags([...props.tags, tag]);
    }
  };
  const createTag = async (): Promise<void> => {
    const { id } = currentTag;

    if (id) {
      client.tags.update.mutate({ ...currentTag, id });
      props.setTags(
        props.tags.filter((tag) => {
          if (tag.id === id) {
            return { ...currentTag, id };
          }

          return tag;
        })
      );
    } else {
      const { id } = await client.tags.create.mutate(currentTag);

      props.setTags([...props.tags, { ...currentTag, id }]);
    }

    setCurrentTag({ color: "gray", label: "" });
  };

  createEffect(
    on(
      () => props.opened,
      () => {
        setCurrentTag({ color: "gray", label: "" });
        setView("select");
      }
    )
  );

  return (
    <div class="h-full flex flex-col gap-2">
      <div class="leading-4 flex justify-center items-center h-8 px-2 pt-2">
        <Heading level={3} class="leading-none">
          <Show
            when={view() === "select"}
            fallback={<>{currentTag.id ? "Update" : "Create"} tag</>}
          >
            Select tags
          </Show>
        </Heading>
        <div class="flex-1" />
        <Show when={view() === "create"}>
          <div class="flex gap-1 justify-center items-center">
            <Show when={currentTag.id}>
              <IconButton
                path={mdiTrashCanOutline}
                text="soft"
                color="contrast"
                variant="text"
                class="m-0"
                loading={deletingTag()}
                onClick={async () => {
                  try {
                    setDeletingTag(true);
                    await client.tags.delete.mutate({ id: currentTag.id! });
                    setDeletingTag(false);
                    setView("select");
                    notify({
                      type: "success",
                      text: "Tag deleted"
                    });
                  } catch {
                    setDeletingTag(false);
                    notify({
                      type: "error",
                      text: "Couldn't delete the tag"
                    });
                  }
                }}
              />
            </Show>
            <IconButton
              path={mdiClose}
              text="soft"
              color="contrast"
              variant="text"
              class="m-0"
              onClick={() => {
                setView("select");
              }}
            />
          </div>
        </Show>
      </div>
      <Switch>
        <Match when={view() === "select"}>
          <div class="flex items-center justify-center gap-2 px-2">
            <Input
              placeholder="Search tags"
              wrapperClass="flex-1 w-[calc(100%-5rem)]"
              class="min-w-0 m-0"
              maxLength={20}
              color="contrast"
              value={currentTag.label}
              setValue={(text) => {
                setCurrentTag("label", text);
              }}
            />
            <Show when={(tags()?.length || 0) > 0}>
              <Tooltip text="Create tag" side="left" fixed class="-ml-1">
                <IconButton
                  path={mdiPlus}
                  color="primary"
                  class="m-0"
                  onClick={() => {
                    setView("create");
                  }}
                />
              </Tooltip>
            </Show>
          </div>
          <div class="relative overflow-hidden pl-2 pr-1 pb-2">
            <div class="overflow-auto max-h-68 scrollbar-sm pr-1" ref={setScrollableListRef}>
              <ScrollShadow scrollableContainerRef={scrollableListRef} />
              <div class="flex flex-col justify-start items-center gap-2">
                <For
                  each={tags()}
                  fallback={
                    <span class="w-full text-center leading-none overflow-hidden">
                      <Button
                        color="primary"
                        class="w-full m-0"
                        onClick={() => {
                          setView("create");
                        }}
                      >
                        Create tag
                      </Button>
                    </span>
                  }
                >
                  {(tag) => {
                    return (
                      <div class="flex justify-center items-center w-full">
                        <button
                          class={clsx(
                            tagColorClasses[tag.color],
                            "rounded-l-lg px-1.5 border-2 h-8 text-base flex justify-start items-center font-semibold flex-1",
                            "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20) hover:opacity-80"
                          )}
                          onClick={() => {
                            switchTag(tag);
                          }}
                        >
                          <span class="flex-1 text-start">{tag.label}</span>
                          <Show when={props.tags.find(({ id }) => id === tag.id)}>
                            <Icon
                              path={mdiClose}
                              class="h-5 w-5 ml-1"
                              onClick={() => {
                                props.setTags(
                                  props.tags.filter((filteredTag) => filteredTag.id !== tag.id)
                                );
                              }}
                            />
                          </Show>
                        </button>
                        <IconButton
                          path={mdiPencil}
                          text="soft"
                          color="contrast"
                          class="m-0 rounded-l-0"
                          onClick={() => {
                            setCurrentTag(tag);
                            setView("create");
                          }}
                        />
                      </div>
                    );
                  }}
                </For>
              </div>
            </div>
          </div>
        </Match>
        <Match when={view() === "create"}>
          <div class="flex items-center justify-center gap-2 px-2">
            <Input
              placeholder="Tag label"
              wrapperClass="flex-1 w-[calc(100%-5rem)]"
              class="min-w-0 m-0"
              maxLength={20}
              color="contrast"
              value={currentTag.label}
              setValue={(label) => {
                setCurrentTag("label", label);
              }}
            />
            <Tooltip text={currentTag.id ? "Update tag" : "Create tag"} side="left" class="-ml-1">
              <IconButton
                path={currentTag.id ? mdiTagCheckOutline : mdiTagPlusOutline}
                color="primary"
                class="m-0"
                loading={creatingTag()}
                onClick={async () => {
                  try {
                    setCreatingTag(true);
                    await createTag();
                    props.setOpened(false);
                    setCreatingTag(false);
                    notify({
                      type: "success",
                      text: "New tag created"
                    });
                  } catch {
                    setCreatingTag(false);
                    notify({
                      type: "error",
                      text: "Couldn't create new tag"
                    });
                  }
                }}
              />
            </Tooltip>
          </div>
          <div class="grid grid-cols-7 gap-2 px-2 pb-2">
            <For each={Object.entries(tagColorClasses)}>
              {([color, tagColorClass]) => {
                return (
                  <Tooltip text={color} class="mt-1 capitalize z-50" fixed>
                    <div
                      class={clsx(
                        "h-8 w-8 rounded-lg border-2 px-1 flex justify-center items-center",
                        "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20)",
                        tagColorClass
                      )}
                      onClick={() => {
                        setCurrentTag("color", color as App.TagColor);
                      }}
                    >
                      <Show when={currentTag.color === color}>
                        <Icon path={mdiCheck} class="w-6 h-6" />
                      </Show>
                    </div>
                  </Tooltip>
                );
              }}
            </For>
          </div>
        </Match>
      </Switch>
    </div>
  );
};

export { TagsDropdown };
