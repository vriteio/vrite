import {
  mdiAccountCircle,
  mdiAccountMultipleOutline,
  mdiAccountMultiplePlusOutline,
  mdiAccountMultipleRemoveOutline,
  mdiClose
} from "@mdi/js";
import { IconButton, Dropdown, Tooltip, Button, Icon, Card } from "#components/primitives";
import clsx from "clsx";
import { Component, For, Show, createSignal } from "solid-js";
import { App } from "#context";
import { MembersDropdown } from "./members-dropdown";

interface MembersInputProps {
  members: App.ContentPieceMember[];
  editable?: boolean;
  setMembers(members: App.ContentPieceMember[]): void;
}

const MembersInput: Component<MembersInputProps> = (props) => {
  const [assignMemberOpened, setAssignMemberOpened] = createSignal(false);

  return (
    <div class="flex items-start justify-start">
      <Show
        when={props.editable !== false}
        fallback={
          <IconButton path={mdiAccountMultipleOutline} variant="text" badge hover={false} />
        }
      >
        <Dropdown
          opened={assignMemberOpened()}
          setOpened={setAssignMemberOpened}
          placement="bottom-start"
          fixed
          cardProps={{ class: "p-0 !max-h-96 !max-w-72 w-72" }}
          activatorButton={() => (
            <Tooltip text="Assign member" side="right">
              <IconButton path={mdiAccountMultiplePlusOutline} variant="text" />
            </Tooltip>
          )}
        >
          <MembersDropdown
            opened={assignMemberOpened()}
            setOpened={setAssignMemberOpened}
            members={props.members}
            setMembers={props.setMembers}
          />
        </Dropdown>
      </Show>
      <div class="flex justify-center items-center m-1">
        <div class="flex flex-wrap gap-2 justify-start items-center">
          <For
            each={props.members}
            fallback={
              <IconButton
                path={mdiAccountMultipleRemoveOutline}
                label="No members"
                text="soft"
                class="whitespace-nowrap m-0"
                disabled={props.editable === false}
                badge={props.editable === false}
                hover={props.editable !== false}
                onClick={() => {
                  setAssignMemberOpened(true);
                }}
              />
            }
          >
            {(member) => {
              return (
                <Button
                  class="rounded-lg h-8 px-1 m-0 text-base flex gap-1 justify-start items-center font-semibold"
                  onClick={() => {
                    setAssignMemberOpened(true);
                  }}
                >
                  <Show
                    when={member.profile?.avatar}
                    fallback={
                      <div class="relative">
                        <Icon path={mdiAccountCircle} class="h-6 w-6 rounded-full" />
                      </div>
                    }
                  >
                    <img src={member.profile?.avatar} class="h-6 w-6 rounded-full" />
                  </Show>
                  <span>
                    <span class="opacity-70">@</span>
                    {member.profile.username}
                  </span>
                </Button>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
};

export { MembersInput };
