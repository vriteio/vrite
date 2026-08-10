import { Tree, TREE_ROOT_ID } from "#web/components/tree";
import { Card, IconButton, Skeleton } from "@andesine/components";
import { type Component, createMemo, Show, Suspense, useTransition } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import { createAsync, revalidate } from "@solidjs/router";
import { PasskeyItem } from "./passkey-item";
import { type Passkey } from "@better-auth/passkey/client";
import { useSettings } from "../../settings-context";
import { format } from "date-fns";
import {
  passkeysQuery,
  useAddPasskeyMutation,
  useDeletePasskeysMutation,
  useRenamePasskeyMutation
} from "#web/lib/data";

interface PasskeyListProps {
  passkeys: Passkey[];
  passkeysRefreshing?: boolean;
  refreshPasskeys(onRevalidate?: () => void): void;
}

const PasskeyList: Component<PasskeyListProps> = (props) => {
  const { openVerificationDialog } = useSettings();
  const deletePasskeysMutation = useDeletePasskeysMutation({
    refresh: props.refreshPasskeys,
    onVerificationRequired: openVerificationDialog
  });
  const renamePasskeyMutation = useRenamePasskeyMutation({
    refresh: props.refreshPasskeys
  });
  const optimisticPasskeys = createMemo<Array<Passkey & { optimistic?: boolean }>>(() => {
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
  const passkeysTree = () => ({
    [TREE_ROOT_ID]: {
      items: optimisticPasskeys().map(({ id }) => id),
      levels: []
    }
  });

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
        itemHeight="2rem"
        renderItem={(itemID) => {
          const passkey = () => optimisticPasskeys().find(({ id }) => id === itemID)!;

          return (
            <PasskeyItem
              id={passkey().id}
              name={passkey().name || "Unnamed passkey"}
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
  const { openVerificationDialog } = useSettings();
  const passkeys = createAsync(() => passkeysQuery());
  const [passkeysRefreshing, startPasskeysRefresh] = useTransition();
  const refreshPasskeys = (onRevalidate: () => void) => {
    void startPasskeysRefresh(() => {
      void (async () => {
        await revalidate(passkeysQuery.key);
        onRevalidate();
      })();
    });
  };
  const addPasskeyMutation = useAddPasskeyMutation({
    name: () => format(new Date(), "MMM d, yyyy"),
    refresh: refreshPasskeys,
    onVerificationRequired: openVerificationDialog
  });

  return (
    <SettingsSection label="Security">
      <div class="flex flex-col">
        <Setting
          label="Passkeys"
          description="Passwordless sign-in using biometrics or a hardware security key"
          fade={false}
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
