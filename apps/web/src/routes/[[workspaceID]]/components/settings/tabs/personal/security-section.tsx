import {
  TreeProvider,
  TreeSelection,
  TreeLevel,
  TreeItem,
  useTree,
  TreeMap
} from "#web/components/tree";
import { DropdownArea, DropdownMenu, IconButton, Skeleton } from "@andesine/components";
import { Component, createEffect, createMemo, createSignal, Show, Suspense } from "solid-js";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";
import clsx from "clsx";
import { format } from "date-fns";
import { useWorkspace } from "#web/context/workspace";
import { authClient } from "#web/lib/client";
import { query, action, useAction, useSubmission, createAsync, revalidate } from "@solidjs/router";
import { useNotify } from "#web/context/notifications";

const PasskeyItem: Component<{
  id: string;
  name: string;
  createdAt: Date;
  disabled?: boolean;
  onDelete: (ids: string[]) => void;
  onRename: (name: string) => void;
}> = (props) => {
  const [{ selection }, { setRenaming, setSelection }] = useTree();
  const [menuOpened, setMenuOpened] = createSignal(false);
  const dropdownOptions = createMemo(() => {
    const selectedIDs = selection();
    const isMulti = selectedIDs.length > 1;

    return [
      ...(!isMulti
        ? [
            [
              {
                label: "Rename",
                icon: "i-lucide:pencil",
                shortcut: "enter",
                onClick: () => setRenaming(props.id)
              }
            ]
          ]
        : []),
      [
        {
          label: isMulti ? `Delete ${selectedIDs.length} passkeys` : "Delete",
          icon: "i-lucide:trash",
          color: "danger" as const,
          shortcut: !isMulti ? "$mod+backspace" : undefined,
          onClick: () => {
            props.onDelete(isMulti ? selectedIDs : [props.id]);
            setSelection([]);
          }
        }
      ]
    ];
  });

  createEffect(() => {
    if (menuOpened()) {
      setSelection((selectedIDs) => (selectedIDs.includes(props.id) ? selectedIDs : [props.id]));
    }
  });

  return (
    <DropdownArea>
      <TreeItem
        id={props.id}
        label={props.name}
        topLevel
        selectable={!props.disabled}
        class="px-1 py-0.5"
        icon={
          <div class="i-fluent:person-passkey-16-regular h-5.5 w-5.5 text-gray-400 dark:text-gray-500" />
        }
        onRename={props.onRename}
        renderLabel={(label) => {
          return (
            <div class="flex-1 flex items-center gap-1.5">
              <div class="flex items-center flex-1 gap-1.5" title={props.name}>
                <div>{label}</div>
                <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
                <span class="text-xs text-gray-400 dark:text-gray-500 shrink-0">
                  {format(props.createdAt, "MMM d, yyyy")}
                </span>
                <div class="flex-1" />
              </div>
            </div>
          );
        }}
        actions={
          <div onClick={(event: MouseEvent) => event.stopPropagation()}>
            <DropdownMenu
              cardProps={{ class: "w-40" }}
              opened={menuOpened()}
              portal={false}
              setOpened={setMenuOpened}
              trigger={() => (
                <div class={clsx(!menuOpened() && "opacity-0 group-hover:opacity-100")}>
                  <IconButton
                    icon="i-lucide:ellipsis-vertical"
                    size="small"
                    variant="text"
                    text="soft"
                    disabled={props.disabled}
                  />
                </div>
              )}
              items={dropdownOptions()}
            />
          </div>
        }
      />
    </DropdownArea>
  );
};
const listUserPasskeys = query(async () => {
  const { data, error } = await authClient.passkey.listUserPasskeys();

  if (error) return [];

  return data ?? [];
}, "listUserPasskeys");
const addPasskeyAction = action(async () => {
  const { error } = await authClient.passkey.addPasskey({
    name: new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  });

  if (error) throw error;

  return true;
});
const deletePasskeyAction = action(async (input: { ids: string[] }) => {
  for (const id of input.ids) {
    const { error } = await authClient.passkey.deletePasskey({ id });

    if (error) throw error;
  }

  return input.ids;
});
const renamePasskeyAction = action(async (input: { id: string; name: string }) => {
  const { error } = await authClient.passkey.updatePasskey({ id: input.id, name: input.name });

  if (error) throw error;

  return input;
});
const SecuritySection: Component = () => {
  const notify = useNotify();
  const { currentWorkspace, sessions } = useWorkspace();
  const addPasskeyRequest = useAction(addPasskeyAction);
  const deletePasskeyRequest = useAction(deletePasskeyAction);
  const renamePasskeyRequest = useAction(renamePasskeyAction);
  const addPasskeySubmission = useSubmission(addPasskeyAction);
  const deletePasskeySubmission = useSubmission(deletePasskeyAction);
  const renamePasskeySubmission = useSubmission(renamePasskeyAction);
  const passkeys = createAsync(() => listUserPasskeys());
  const passkeyMutationText = createMemo(() => {
    if (addPasskeySubmission.pending) {
      return "Adding passkey...";
    }

    if (deletePasskeySubmission.pending) {
      const count = deletePasskeySubmission.input?.[0]?.ids.length ?? 0;

      return count > 1 ? `Deleting ${count} passkeys...` : "Deleting passkey...";
    }

    if (renamePasskeySubmission.pending) {
      return "Renaming passkey...";
    }

    return null;
  });
  const isPasskeyBusy = createMemo(() => Boolean(passkeyMutationText()));

  const passkeysTree = createMemo<TreeMap>(() => {
    const passkeyItems = (passkeys() ?? []).map((p) => p.id);

    return {
      "*": { items: passkeyItems, levels: [] }
    };
  });
  const addPasskey = async () => {
    if (!window.PublicKeyCredential) {
      notify({ type: "error", text: "Passkeys are not supported in this browser" });
      return;
    }

    try {
      await addPasskeyRequest();

      notify({ type: "success", text: "Passkey added" });
      revalidate("listUserPasskeys");
    } catch (error) {
      notify({ type: "error", text: "Failed to add passkey" });
    }
  };

  const deletePasskey = async (passkeyIDs: string[]) => {
    try {
      await deletePasskeyRequest({ ids: passkeyIDs });

      notify({
        type: "success",
        text: passkeyIDs.length > 1 ? `${passkeyIDs.length} passkeys deleted` : "Passkey deleted"
      });
      revalidate("listUserPasskeys");
    } catch (error) {
      notify({ type: "error", text: "Failed to delete passkey" });
    }
  };

  const renamePasskey = async (id: string, name: string) => {
    const trimmed = name.trim();

    if (!trimmed) return;

    try {
      await renamePasskeyRequest({ id, name: trimmed });

      notify({ type: "success", text: "Passkey renamed" });
      revalidate("listUserPasskeys");
    } catch (error) {
      notify({ type: "error", text: "Failed to rename passkey" });
    }
  };

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
              onClick={addPasskey}
              disabled={isPasskeyBusy()}
              iconProps={{ class: "h-4 w-4" }}
              icon="i-lucide:plus"
              size="small"
              color="contrast"
              variant="outlined"
              text="soft"
            />
          </div>
        </Setting>
        <Show when={passkeyMutationText()}>
          <div class="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            <Skeleton class="h-4 w-4 rounded-full" />
            <span>{passkeyMutationText()}</span>
          </div>
        </Show>
        <div class="w-full flex flex-col gap-1.5">
          <Suspense fallback={<Skeleton class={["h-7", "h-7"]} />}>
            <Show
              when={passkeys()?.length}
              fallback={
                <span class="text-sm text-gray-400 dark:text-gray-500">
                  No passkeys yet. Add one for faster, passwordless sign-in on this device.
                </span>
              }
            >
              <TreeProvider tree={passkeysTree} itemHeight={32}>
                <div class="relative flex flex-col">
                  <TreeSelection />
                  <TreeLevel
                    levelID="*"
                    tree={passkeysTree}
                    renderLevel={() => <></>}
                    renderItem={(itemID) => {
                      const passkey = () => passkeys()?.find((p) => p.id === itemID);

                      return (
                        <Show when={passkey()}>
                          {(pk) => (
                            <div class="relative">
                              <PasskeyItem
                                id={pk().id}
                                name={pk().name || "Unnamed passkey"}
                                createdAt={pk().createdAt}
                                disabled={isPasskeyBusy()}
                                onDelete={deletePasskey}
                                onRename={(name) => renamePasskey(pk().id, name)}
                              />
                            </div>
                          )}
                        </Show>
                      );
                    }}
                  />
                </div>
              </TreeProvider>
            </Show>
          </Suspense>
        </div>
      </div>
    </SettingsSection>
  );
};

export { SecuritySection };
