import { mdiAccountCircle } from "@mdi/js";
import { createDebouncedMemoOn } from "@solid-primitives/memo";
import clsx from "clsx";
import {
  Component,
  createSignal,
  createResource,
  createEffect,
  on,
  Show,
  For,
  createMemo
} from "solid-js";
import { createStore } from "solid-js/store";
import { App, useClientContext } from "#context";
import { Heading, Input, Icon, Button, Loader } from "#components/primitives";
import { ScrollShadow } from "#components/fragments";

interface MembersDropdownProps {
  opened: boolean;
  members: App.ContentPieceMember[];
  setOpened(opened: boolean): void;
  setMembers(members: App.ContentPieceMember[]): void;
}
interface MemberCardProps {
  member: App.ContentPieceMember;
  assigned: boolean;
  assignMember(): void;
  removeMember(): void;
}

const MemberCard: Component<MemberCardProps> = (props) => {
  return (
    <Button
      color={props.assigned ? "primary" : "contrast"}
      text={props.assigned ? "primary" : "soft"}
      class="w-full flex justify-center items-start m-0 p-1.5"
      onClick={() => {
        if (props.assigned) {
          props.removeMember();
        } else {
          props.assignMember();
        }
      }}
    >
      <div
        class={clsx(
          "h-10 w-10 relative mr-1.5 rounded-full",
          props.assigned && "border-2 border-white border-opacity-80"
        )}
      >
        <Show
          when={props.member.profile?.avatar}
          fallback={<Icon path={mdiAccountCircle} class="h-full w-full" />}
        >
          <img src={props.member.profile?.avatar} class="h-full w-full" />
        </Show>
      </div>
      <div
        class={clsx(
          "flex flex-col flex-1 items-start min-h-10 justify-center text-start",
          !props.assigned && "text-gray-700 dark:text-inherit"
        )}
      >
        <Heading level={3} class="leading-5">
          <Show
            when={props.member.profile?.fullName}
            fallback={
              <span>
                <span class="opacity-70">@</span>
                {props.member.profile?.username}
              </span>
            }
          >
            {props.member.profile?.fullName}
          </Show>
        </Heading>
        <Show when={props.member.profile?.fullName}>
          <p
            class={clsx(
              "text-sm leading-none break-anywhere",
              props.assigned ? "opacity-80" : "text-gray-500 dark:text-gray-400 "
            )}
          >
            <span class="opacity-70">@</span>
            {props.member.profile?.username}
          </p>
        </Show>
      </div>
    </Button>
  );
};
const MembersDropdown: Component<MembersDropdownProps> = (props) => {
  const { client } = useClientContext();
  const [scrollableListRef, setScrollableListRef] = createSignal<HTMLElement | null>(null);
  const [query, setQuery] = createSignal("");
  const [members] = createResource(
    createDebouncedMemoOn(query, (value) => value.toLowerCase().replace(/\s/g, "_"), 250),
    async (query) => {
      return client.workspaceMemberships.searchMembers.query({
        query
      });
    }
  );

  return (
    <div class="h-full flex flex-col gap-2">
      <div class="leading-4 flex justify-center items-center h-8 px-2 pt-2">
        <Heading level={3} class="leading-none">
          Assign members
        </Heading>
        <div class="flex-1" />
      </div>
      <div class="flex items-center justify-center gap-2 px-2">
        <Input
          placeholder="Search members"
          wrapperClass="flex-1 w-[calc(100%-5rem)]"
          class="min-w-0 m-0"
          maxLength={20}
          color="contrast"
          value={query()}
          setValue={(text) => {
            setQuery(text.toLowerCase().replace(/\s/g, "_"));
          }}
        />
      </div>
      <div class="relative overflow-hidden pl-2 pr-1 pb-2">
        <div class="overflow-auto max-h-68 scrollbar-sm pr-1" ref={setScrollableListRef}>
          <ScrollShadow scrollableContainerRef={scrollableListRef} />
          <div class="flex flex-col justify-start items-center gap-2 overflow-hidden">
            <Show when={!members.loading} fallback={<Loader />}>
              <For each={members()} fallback="No members found">
                {(member) => {
                  return (
                    <MemberCard
                      member={member}
                      assigned={props.members.some(({ id }) => id === member.id)}
                      assignMember={() => {
                        props.setMembers([...props.members, member]);
                      }}
                      removeMember={() => {
                        props.setMembers(props.members.filter(({ id }) => id !== member.id));
                      }}
                    />
                  );
                }}
              </For>
            </Show>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MembersDropdown };
