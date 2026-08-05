import { Button, Fragment, IconButton, Input, ToggleGroup, Tooltip } from "@andesine/components";
import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { type Component, createEffect, createMemo, createSignal, For } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { type KeyPermission } from "#web/lib/api";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import { NewKeyDialog } from "../new-key-dialog";
import { Dynamic } from "solid-js/web";
import { useWorkspace } from "#web/context/workspace";
import { apiKeyQuery, useKeyMutations } from "#web/lib/data";
import { type AccessLevel, createPermissionAccessMapper } from "#web/lib/permissions";

type Resource = "entries" | "collections" | "memberships" | "roles";
type ResourceAccess = Record<Resource, AccessLevel>;

const resources: Array<{ id: Resource; label: string; description: string }> = [
  { id: "entries", label: "Entries", description: "Content entries within collections" },
  { id: "collections", label: "Collections", description: "Collection structure and metadata" },
  { id: "memberships", label: "People", description: "Workspace members and invitations" },
  { id: "roles", label: "Roles", description: "Workspace roles and permissions" }
];

const accessLevels: Array<{ value: AccessLevel; label: string }> = [
  { value: "default", label: "None" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" }
];

const { accessToPermissions, permissionsToAccess } = createPermissionAccessMapper<
  Resource,
  KeyPermission
>({
  resources: [
    { id: "entries", read: "read:entries", write: "entries" },
    { id: "collections", read: "read:collections", write: "collections" },
    { id: "memberships", read: "read:memberships", write: "memberships" },
    { id: "roles", read: "read:roles", write: "roles" }
  ]
});

const KeySettingsPage: Component = () => {
  const notify = useNotify();
  const { hasPermission } = useWorkspace();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string; keyID?: string }>();
  const keyID = () => params.keyID || null;
  const navigateToAPI = () => navigate(`/${params.workspaceID || ""}/settings/api`);
  const keyResult = createAsync(
    async () => {
      if (!keyID()) return { key: null };

      try {
        return { key: await apiKeyQuery({ keyID: keyID()! }) };
      } catch (error) {
        console.error(error);

        return { key: null, error: true };
      }
    },
    { deferStream: true }
  );
  const key = () => keyResult()?.key ?? null;
  const [keyName, setKeyName] = createSignal(key()?.name ?? "");
  const [resourceAccess, setResourceAccess] = createSignal<ResourceAccess>(
    permissionsToAccess(key()?.permissions ?? [])
  );
  const [revealedKey, setRevealedKey] = createSignal("");
  const { createKeyMutation, updateKeyMutation } = useKeyMutations({
    keyID,
    navigateToAPI,
    onCreated: setRevealedKey
  });
  const fillError = createMemo((): string => {
    if (!keyName().trim()) {
      return "Key name is required";
    }

    const permissions = accessToPermissions(resourceAccess());

    if (permissions.length === 0) {
      return "Grant at least one permission";
    }

    return "";
  });
  createEffect(() => {
    const result = keyResult();
    const currentKey = key();

    if (keyID() && result?.error) {
      notify({ type: "error", text: "API key is unavailable" });
      navigate(`/${params.workspaceID || ""}/settings/api`, { replace: true });

      return;
    }

    if (currentKey) {
      setKeyName(currentKey.name);
      setResourceAccess(permissionsToAccess(currentKey.permissions));
    }
  });

  return (
    <>
      <NewKeyDialog
        key={revealedKey()}
        onClose={() => {
          setRevealedKey("");
          createKeyMutation.reset();
          navigateToAPI();
        }}
      />
      <div class="flex min-w-0 flex-col">
        <SettingsSection label="Key details">
          <Setting label="Name" description="Descriptive name for this key" fade={false}>
            <Input
              placeholder="My API key"
              variant="outlined"
              color="contrast"
              size="small"
              value={keyName()}
              setValue={setKeyName}
              disabled={!hasPermission("api_keys")}
              class="w-full max-w-md"
            />
          </Setting>
        </SettingsSection>
        <SettingsSection label="Permissions">
          <For each={resources}>
            {(resource) => (
              <Setting label={resource.label} description={resource.description} fade={false} hover>
                <ToggleGroup
                  disabled={
                    !hasPermission("api_keys") ||
                    createKeyMutation.isPending ||
                    updateKeyMutation.isPending
                  }
                  value={resourceAccess()[resource.id]}
                  setValue={(value) => {
                    setResourceAccess((prev) => ({
                      ...prev,
                      [resource.id]: value as AccessLevel
                    }));
                  }}
                  options={accessLevels.map((option) => ({
                    value: option.value,
                    label: option.label
                  }))}
                />
              </Setting>
            )}
          </For>
        </SettingsSection>
        <div class="w-full h-4 flex justify-center items-center">
          <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
        </div>
        <div class="flex items-center justify-end gap-2">
          <Tooltip content="Go back">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:chevron-left"
              onClick={navigateToAPI}
            />
          </Tooltip>
          <Dynamic
            component={fillError() ? Tooltip : Fragment}
            content={fillError()}
            wrapperClass="flex-1"
          >
            <Button
              color="primary"
              variant="outlined"
              size="small"
              onClick={() => {
                if (Boolean(keyID())) {
                  updateKeyMutation.mutate({
                    id: keyID()!,
                    name: keyName(),
                    permissions: accessToPermissions(resourceAccess())
                  });
                } else {
                  createKeyMutation.mutate({
                    name: keyName(),
                    permissions: accessToPermissions(resourceAccess())
                  });
                }
              }}
              class="flex items-center gap-1 w-full justify-center"
              disabled={!hasPermission("api_keys") || Boolean(fillError())}
              loading={createKeyMutation.isPending || updateKeyMutation.isPending}
            >
              {Boolean(keyID()) ? "Save changes" : "Create key"}
            </Button>
          </Dynamic>
        </div>
      </div>
    </>
  );
};

export default KeySettingsPage;
