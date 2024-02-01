import { Component, createMemo, For, Show } from "solid-js";
import { mdiAccountCircle, mdiCalendar, mdiCalendarRemove, mdiEye, mdiPencil } from "@mdi/js";
import dayjs from "dayjs";
import DOMPurify from "dompurify";
import clsx from "clsx";
import { useNavigate } from "@solidjs/router";
import {
  App,
  hasPermission,
  useAuthenticatedUserData,
  useContentData,
  useLocalStorage
} from "#context";
import { Button, Card, Heading, Icon, IconButton, Tooltip } from "#components/primitives";
import { breakpoints, tagColorClasses } from "#lib/utils";

interface ContentPieceProps {
  contentPiece: App.ContentPieceWithAdditionalData;
  dataProps: Record<string, string>;
  index: number;
}

const ContentPieceCard: Component<ContentPieceProps> = (props) => {
  const { activeContentPieceId, setActiveContentPieceId } = useContentData();
  const { setStorage } = useLocalStorage();
  const { deletedTags } = useAuthenticatedUserData();
  const navigate = useNavigate();
  const displayTags = createMemo(() => {
    const visibleTags: App.Tag[] = [];
    const hiddenTags: App.Tag[] = [];
    const lengthLimit = 21;

    let length = 0;

    props.contentPiece.tags
      .filter((tag) => {
        return !deletedTags().includes(tag.id);
      })
      .forEach((tag, index) => {
        length += tag.label.length;

        if (length < lengthLimit && index < 3) {
          visibleTags.push(tag);
        } else {
          hiddenTags.push(tag);
        }
      });

    return { visible: visibleTags, hidden: hiddenTags };
  });

  return (
    <Card
      class="flex flex-col p-3 m-0 contentPiece-card select-none"
      color="contrast"
      onClick={() => {
        setStorage((storage) => ({
          ...storage,
          sidePanelView: "contentPiece",
          sidePanelWidth: storage.sidePanelWidth || 375
        }));
        setActiveContentPieceId(props.contentPiece.id);
      }}
      data-content-piece-id={props.contentPiece.id}
      data-index={props.index}
      {...props.dataProps}
    >
      <Heading level={4} class="font-bold clamp-2">
        <div
          class="contents"
          innerHTML={DOMPurify.sanitize(props.contentPiece.title || "[No Title]")}
        />
      </Heading>
      <p
        class="mt-2 prose text-gray-500 dark:text-gray-400 clamp-3 min-h-10 narrow-prose"
        innerHTML={DOMPurify.sanitize(props.contentPiece.description || "[No Description]")}
      ></p>
      <div class="overflow-hidden flex justify-start items-center gap-2">
        <For each={displayTags().visible}>
          {(tag) => {
            return (
              <button
                class={clsx(
                  tagColorClasses[tag.color],
                  "rounded-lg px-1.5 border-2 h-8 text-base flex justify-start items-center font-semibold",
                  "border-opacity-50 bg-opacity-20 dark:(border-opacity-50 bg-opacity-20) hover:opacity-80"
                )}
              >
                {tag.label}
              </button>
            );
          }}
        </For>
        <Show when={displayTags().hidden.length > 0}>
          <Button text="soft" class="font-bold m-0">
            +{displayTags().hidden.length}
          </Button>
        </Show>
      </div>
      <Card
        color="soft"
        class="flex items-center justify-start flex-1 -mb-3 -ml-3 -mr-3 mt-2 border-b-0 rounded-t-none rounded-b-xl border-x-0"
      >
        <Show
          when={props.contentPiece.date}
          fallback={
            <IconButton variant="text" path={mdiCalendarRemove} badge label="No date" text="soft" />
          }
        >
          <IconButton
            variant="text"
            path={mdiCalendar}
            badge
            label={dayjs(props.contentPiece.date).format("MMM D, YYYY")}
            text="soft"
          />
        </Show>
        <div class="flex-1" />
        <div class="mx-1 gap-1 flex">
          <For each={props.contentPiece.members.slice(0, 3)}>
            {(member) => {
              return (
                <Tooltip
                  text={member.profile.username}
                  class="mt-1"
                  wrapperClass="-ml-2 hover:z-10"
                >
                  <div class="relative h-7 w-7 rounded-full overflow-hidden">
                    <Show when={member.profile?.avatar} fallback={<Icon path={mdiAccountCircle} />}>
                      <img src={member.profile?.avatar} />
                    </Show>
                  </div>
                </Tooltip>
              );
            }}
          </For>
        </div>
        <Tooltip text="Open in editor" side="left">
          <IconButton
            path={hasPermission("editMetadata") ? mdiPencil : mdiEye}
            text={activeContentPieceId() === props.contentPiece.id ? "primary" : "soft"}
            color={activeContentPieceId() === props.contentPiece.id ? "primary" : "contrast"}
            class="whitespace-nowrap contentPiece-card-edit"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setStorage((storage) => ({
                ...storage,
                sidePanelWidth: breakpoints.md() ? storage.sidePanelWidth || 375 : 0,
                sidePanelView: "contentPiece"
              }));
              setActiveContentPieceId(props.contentPiece.id);
              navigate(`/editor/${props.contentPiece.id || ""}`);
            }}
          />
        </Tooltip>
      </Card>
    </Card>
  );
};

export { ContentPieceCard };
