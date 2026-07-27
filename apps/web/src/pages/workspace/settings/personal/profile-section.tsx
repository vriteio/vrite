import { Component, createEffect, createSignal, Show } from "solid-js";
import { SettingsSection } from "../settings-section";
import { Input, Spinner } from "@andesine/components";
import { Setting } from "../setting";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { revalidate } from "@solidjs/router";
import { authClient } from "#web/lib/client";
import { createMutation } from "@tanstack/solid-query";
import clsx from "clsx";

const ProfileSection: Component = () => {
  const notify = useNotify();
  const { currentSession } = useWorkspace();
  const [name, setName] = createSignal(currentSession()?.user?.name || "");

  const updateProfileNameMutation = createMutation(() => ({
    onSuccess: () => {
      revalidate("sessions");
    },
    onError: (error) => {
      console.error(error);
      setName(currentSession()?.user?.name || "");
      notify({
        type: "error",
        text: "Failed to update profile name"
      });
    },
    mutationFn: async (input: { name: string }) => {
      const { error } = await authClient.updateUser({
        name: input.name
      });

      if (error) throw error;
    }
  }));

  createEffect(() => {
    setName(currentSession()?.user?.name || "");
  });

  return (
    <SettingsSection label="Profile">
      <Setting label="Full name" description="Your full name" fade={false}>
        <div class="flex w-full max-w-md flex-col gap-2">
          <div class="relative">
            <Input
              placeholder="Your name"
              class={clsx("w-full", updateProfileNameMutation.isPending && "animate-pulse")}
              disabled={updateProfileNameMutation.isPending}
              size="small"
              color="contrast"
              variant="outlined"
              value={name()}
              setValue={setName}
              slot={() => {
                return (
                  <Show when={updateProfileNameMutation.isPending}>
                    <div class="absolute right-0 p-1.5">
                      <Spinner class="h-4 w-4" color="primary" />
                    </div>
                  </Show>
                );
              }}
              onConfirm={() => {
                if (name() !== currentSession()?.user?.name) {
                  updateProfileNameMutation.mutate({ name: name() });
                }
              }}
              onCancel={() => {
                setName(currentSession()?.user?.name || "");
              }}
            />
          </div>
        </div>
      </Setting>
    </SettingsSection>
  );
};

export { ProfileSection };
