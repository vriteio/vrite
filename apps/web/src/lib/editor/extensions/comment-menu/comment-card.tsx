import { mdiAccountCircle, mdiDotsVertical, mdiTrashCan } from "@mdi/js";
import dayjs from "dayjs";
import { Component, Show, createMemo, createSignal } from "solid-js";
import clsx from "clsx";
import { App, useClient } from "#context";
import { Icon, Card, Dropdown, IconButton } from "#components/primitives";

type CommentWithMember = Omit<App.Comment, "memberId"> & { member: App.CommentMember | null };

interface CommentCardProps {
  comment: CommentWithMember;
  class?: string;
}

const CommentCard: Component<CommentCardProps> = (props) => {
  const [dropdownOpened, setDropdownOpened] = createSignal(false);
  const [deleting, setDeleting] = createSignal(false);
  const client = useClient();
  const member = createMemo(() => {
    return props.comment.member;
  });

  return (
    <Card class={clsx("m-0 not-prose", props.class)}>
      <div class="flex justify-start items-start m-0">
        <Show
          when={member()?.profile?.avatar}
          fallback={
            <Icon path={mdiAccountCircle} class="h-10 w-10 text-gray-500 dark:text-gray-400" />
          }
        >
          <img src={`${member()?.profile?.avatar}?h=80&w=80`} class="h-10 w-10" />
        </Show>
        <div class="flex flex-col flex-1 gap-1 min-h-10 justify-center mx-2">
          <span class="whitxespace-nowrap font-semibold leading-4">
            <Show
              when={member()?.profile?.fullName}
              fallback={
                <>
                  <span class="opacity-70">@</span>
                  {member()?.profile?.username}
                </>
              }
            >
              {member()?.profile?.fullName}
            </Show>
          </span>
          <Show when={member()?.profile?.fullName}>
            <span class="whitespace-nowrap text-sm leading-3 text-gray-500 dark:text-gray-400">
              <span class="opacity-70">@</span>
              {member()?.profile?.username}
            </span>
          </Show>
        </div>
        <span
          class="text-gray-500 dark:text-gray-400 text-xs leading-5 mr-0.75 clamp-1"
          title={dayjs(props.comment.date).format("MMMM D, YYYY [at] h:mm A")}
        >
          {dayjs(props.comment.date).fromNow()}
        </span>
        <Dropdown
          activatorButton={() => (
            <IconButton
              path={mdiDotsVertical}
              class="m-0"
              variant="text"
              text="soft"
              size="small"
            />
          )}
          cardProps={{
            class: "p-1 rounded-xl",
            color: "contrast"
          }}
          placement="left-start"
          fixed
          overlay={false}
          opened={dropdownOpened()}
          setOpened={setDropdownOpened}
        >
          <IconButton
            path={mdiTrashCan}
            label="Delete"
            size="small"
            color="danger"
            loading={deleting()}
            onClick={async () => {
              setDeleting(true);
              await client.comments.deleteComment.mutate({
                id: props.comment.id
              });
              setDeleting(false);
              setDropdownOpened(false);
            }}
          />
        </Dropdown>
      </div>
      <div class="prose p-1 pt-2" innerHTML={props.comment.content}></div>
    </Card>
  );
};

export { CommentCard };
export type { CommentWithMember };
