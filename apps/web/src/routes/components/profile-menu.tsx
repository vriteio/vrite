import { client } from "#web/lib/client";
import { Tooltip, IconButton } from "#web/components/primitives";
import { Component } from "solid-js";
import clsx from "clsx";

interface ProfileMenuProps {
  color?: "base" | "contrast";
  class?: string;
}

const ProfileMenu: Component<ProfileMenuProps> = (props) => {
  return (
    <div class={clsx("p-1", props.class)}>
      <div class="flex gap-1 justify-center items-center">
        <div class="flex gap-2">
          <div class="i-lucide:circle-user h-6 w-6 text-gray-500 dark:text-gray-400" />
          <span>
            <span class="text-gray-400 dark:text-gray-500">@</span>areknawo
          </span>
        </div>
        <div class="flex-1" />
        <Tooltip text="Log out" side="top" class="-mt-1" fixed>
          <IconButton
            icon="i-lucide:log-out"
            size="small"
            variant="text"
            text="soft"
            onClick={async () => {
              await client.auth.logout.post();
              window.location.reload();
            }}
          />
        </Tooltip>
      </div>
    </div>
  );
};

export { ProfileMenu };
