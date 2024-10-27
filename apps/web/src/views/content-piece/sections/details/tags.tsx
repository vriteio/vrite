import { TagsDropdown } from "./tags-dropdown";
import { mdiTagOutline, mdiTagPlusOutline, mdiTagRemoveOutline, mdiClose } from "@mdi/js";
import clsx from "clsx";
import { Component, For, Show, createSignal } from "solid-js";
import { IconButton, Dropdown, Tooltip, Icon } from "#components/primitives";
import { tagColorClasses } from "#lib/utils";
import { App } from "#context";

interface TagsInputProps {
  tags: App.Tag[];
  editable?: boolean;
  setTags(tags: App.Tag[]): void;
}

const TagsInput: Component<TagsInputProps> = (props) => {
  const [newTagOpened, setNewTagOpened] = createSignal(false);

  return (
    <div class="flex items-start justify-start">
      <Show
        when={props.editable !== false}
        fallback={<IconButton path={mdiTagOutline} variant="text" badge hover={false} />}
      >
        <Dropdown
          opened={newTagOpened()}
          setOpened={setNewTagOpened}
          placement="bottom-start"
          fixed
          cardProps={{ class: "p-0 !max-h-96 !max-w-72 w-72" }}
          activatorButton={() => (
            <Tooltip text="Add tag" side="right">
              <IconButton path={mdiTagPlusOutline} variant="text" class="ml-0" />
            </Tooltip>
          )}
        >
          <TagsDropdown
            opened={newTagOpened()}
            setOpened={setNewTagOpened}
            setTags={props.setTags}
            tags={props.tags}
          />
        </Dropdown>
      </Show>
      <div class="flex justify-center items-center m-1">
        <div class="flex flex-wrap gap-2 justify-start items-center">
          <For
            each={props.tags}
            fallback={
              <IconButton
                path={mdiTagRemoveOutline}
                label="No tags"
                text="soft"
                class="whitespace-nowrap m-0"
                disabled={props.editable === false}
                badge={props.editable === false}
                hover={props.editable !== false}
                onClick={() => {
                  setNewTagOpened(true);
                }}
              />
            }
          >
            {(tag) => {
              return (
                <button
                  class={clsx(
                    tagColorClasses[tag.color],
                    "rounded-lg px-1.5 border h-8 text-base flex justify-start items-center font-semibold",
                    "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20) hover:opacity-80"
                  )}
                >
                  {tag.label}
                  <Icon
                    path={mdiClose}
                    class="h-5 w-5 ml-1"
                    onClick={() => {
                      props.setTags(props.tags.filter((filteredTag) => filteredTag.id !== tag.id));
                    }}
                  />
                </button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export { TagsInput };
