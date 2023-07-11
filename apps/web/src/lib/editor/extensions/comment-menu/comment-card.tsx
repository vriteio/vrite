import { mdiAccountCircle } from "@mdi/js";
import dayjs from "dayjs";
import { Component, Show, createMemo } from "solid-js";
import { App } from "#context";
import { Icon, Card } from "#components/primitives";

interface CommentCardProps {
  comment: Omit<App.Comment, "memberId"> & { member: App.CommentMember | null };
  contrast?: boolean;
}

const CommentCard: Component<CommentCardProps> = (props) => {
  const member = createMemo(() => {
    return props.comment.member;
  });

  return (
    <Card class="m-0 not-prose" color={props.contrast ? "contrast" : "base"}>
      <div class="flex gap-2 justify-start items-start m-0">
        <Show
          when={member()?.profile?.avatar}
          fallback={
            <Icon path={mdiAccountCircle} class="h-10 w-10 text-gray-500 dark:text-gray-400" />
          }
        >
          <img src={member()?.profile?.avatar} class="h-10 w-10" />
        </Show>
        <div class="flex flex-col flex-1 gap-1 min-h-10 justify-center">
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
        <span class="text-gray-500 dark:text-gray-400 text-xs">
          {dayjs(props.comment.date).fromNow()}
        </span>
      </div>
      <div class="prose p-1 pt-2" innerHTML={props.comment.content}></div>
    </Card>
  );
};

export { CommentCard };
