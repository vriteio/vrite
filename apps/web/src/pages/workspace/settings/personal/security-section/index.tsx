import { Tree, TREE_ROOT_ID } from "#web/components/tree";
import { Card, IconButton, Skeleton } from "@andesine/components";
import { Component, createMemo, Show, Suspense, useTransition } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { authClient } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { createMutation } from "@tanstack/solid-query";
import { createAsync, query, revalidate } from "@solidjs/router";
import { PasskeyItem } from "./passkey-item";
import { Passkey } from "@better-auth/passkey/client";
import { useSettings } from "../../settings-context";
import { format } from "date-fns";

interface PasskeyListProps {
  passkeys: Passkey[];
  passkeysRefreshing?: boolean;
  refreshPasskeys(onRevalidate?: () => void): void;
}

const passkeysQuery = query(async () => {
  const { data, error } = await authClient.passkey.listUserPasskeys();

  if (error || !data) return [];

  return data;
}, "passkeys");
const PasskeyList: Component<PasskeyListProps> = (props) => {
  const notify = useNotify();
  const { openVerificationDialog } = useSettings();
  const addPasskeyMutation = createMutation(() => ({
    onSuccess: () => {
      props.refreshPasskeys(() => addPasskeyMutation.reset());
      notify({
        text: "Passkey added successfully",
        type: "success"
      });
    },
    onError: (error) => {
      console.error(error);
      notify({
        text: "Failed to add passkey",
        type: "error"
      });
    },
    mutationFn: async () => {
      const { error, data } = await authClient.passkey.addPasskey({
        name: `Andesine (${new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        })})`
      });

      if (error) throw error;

      return data;
    }
  }));
  const deletePasskeysMutation = createMutation(() => ({
    onSuccess: () => {
      props.refreshPasskeys(() => deletePasskeysMutation.reset());
    },
    onError: (error, { ids }) => {
      console.error(error);

      if ("code" in error && error.code === "SESSION_NOT_FRESH") {
        return openVerificationDialog(() => deletePasskeysMutation.mutate({ ids }));
      }

      notify({
        text: `Failed to delete passkey${ids.length > 1 ? "s" : ""}`,
        type: "error"
      });
    },
    mutationFn: async (input: { ids: string[] }) => {
      for (const id of input.ids) {
        const { error } = await authClient.passkey.deletePasskey({ id });

        if (error) throw error;
      }
    }
  }));
  const renamePasskeyMutation = createMutation(() => ({
    onSuccess: () => {
      props.refreshPasskeys(() => renamePasskeyMutation.reset());
    },
    onError: (error, { name }) => {
      console.error(error);
      notify({
        text: `Failed to rename passkey to "${name}"`,
        type: "error"
      });
    },
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await authClient.passkey.updatePasskey({
        id: input.id,
        name: input.name
      });

      if (error) throw error;
    }
  }));
  const optimisticPasskeys = createMemo<Array<Passkey & { optimistic?: boolean }>>(() => {
    if (props.passkeysRefreshing && addPasskeyMutation.data) {
      return [...props.passkeys, { ...addPasskeyMutation.data, optimistic: true }];
    }

    if (
      (deletePasskeysMutation.isPending || props.passkeysRefreshing) &&
      deletePasskeysMutation.variables
    ) {
      return props.passkeys.filter((passkey) => {
        return !deletePasskeysMutation.variables!.ids.includes(passkey.id);
      });
    }

    if (
      (renamePasskeyMutation.isPending || props.passkeysRefreshing) &&
      renamePasskeyMutation.variables
    ) {
      return props.passkeys.map((passkey) => {
        if (passkey.id === renamePasskeyMutation.variables!.id) {
          return { ...passkey, name: renamePasskeyMutation.variables!.name, optimistic: true };
        }

        return passkey;
      });
    }

    return props.passkeys;
  });
  const passkeysTree = () => {
    return {
      [TREE_ROOT_ID]: {
        items: optimisticPasskeys().map(({ id }) => id),
        levels: []
      }
    };
  };

  return (
    <Show
      when={optimisticPasskeys().length}
      fallback={
        <Card
          class="rounded-lg text-gray-400 bg-white text-sm px-2 h-16 flex items-center justify-center gap-1"
          shade
        >
          <div class="i-fluent:person-passkey-16-regular h-5.5 w-5.5 text-gray-300" /> No registered
          passkeys
        </Card>
      }
    >
      <Tree
        tree={passkeysTree}
        itemHeight={32}
        renderItem={(itemID) => {
          const passkey = () => optimisticPasskeys().find(({ id }) => id === itemID)!;

          return (
            <PasskeyItem
              id={passkey().id}
              name={renamePasskeyMutation.variables?.name || passkey().name || "Unnamed passkey"}
              createdAt={passkey().createdAt}
              loading={passkey().optimistic}
              onDelete={(ids) => {
                deletePasskeysMutation.mutate({ ids });
              }}
              onRename={(name) => {
                renamePasskeyMutation.mutate({ id: passkey().id, name });
              }}
            />
          );
        }}
      />
    </Show>
  );
};
const SecuritySection: Component = () => {
  const notify = useNotify();
  const { openVerificationDialog } = useSettings();
  const passkeys = createAsync(() => passkeysQuery());
  const [passkeysRefreshing, startPasskeysRefresh] = useTransition();
  const refreshPasskeys = (onRevalidate: () => void) => {
    startPasskeysRefresh(async () => {
      await revalidate(passkeysQuery.key);
      onRevalidate();
    });
  };
  const addPasskeyMutation = createMutation(() => ({
    onSuccess: () => {
      refreshPasskeys(() => addPasskeyMutation.reset());
      notify({
        text: "Passkey added successfully",
        type: "success"
      });
    },
    onError: (error) => {
      console.error(error);

      if ("code" in error && error.code === "SESSION_NOT_FRESH") {
        return openVerificationDialog(() => addPasskeyMutation.mutate());
      }

      notify({
        text: "Failed to add passkey",
        type: "error"
      });
    },
    mutationFn: async () => {
      const { error, data } = await authClient.passkey.addPasskey({
        name: format(new Date(), "MMM d, yyyy")
      });

      if (error) throw error;

      return data;
    }
  }));

  return (
    <SettingsSection label="Security">
      <div class="flex flex-col">
        <Setting
          label="Passkeys"
          description="Passwordless sign-in using biometrics or a hardware security key"
        >
          <div class="flex flex-col gap-3 w-full items-end">
            <IconButton
              label={() => <span class="px-1">Add a passkey</span>}
              class="flex-row-reverse pr-1"
              onClick={() => addPasskeyMutation.mutate()}
              loading={addPasskeyMutation.isPending}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
            />
          </div>
        </Setting>
        <div class="w-full flex flex-col relative">
          <Suspense
            fallback={
              <div class="flex flex-col">
                <div class="flex items-center gap-1 h-8 px-1">
                  <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                </div>
                <div class="flex items-center gap-1 h-8 px-1">
                  <Skeleton class={["h-6 w-6", "h-6 flex-1"]} />
                </div>
              </div>
            }
          >
            <PasskeyList
              passkeys={passkeys() || []}
              passkeysRefreshing={passkeysRefreshing()}
              refreshPasskeys={refreshPasskeys}
            />
          </Suspense>
        </div>
      </div>
    </SettingsSection>
  );
};

export { SecuritySection };
