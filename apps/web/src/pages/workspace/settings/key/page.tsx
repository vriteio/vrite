import { Button, Fragment, IconButton, Input, ToggleGroup, Tooltip } from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createEffect, createMemo, createSignal, For } from "solid-js";

import { useNotify } from "#web/context/notifications";
import { client, type KeyPermission } from "#web/lib/client";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import { NewKeyDialog } from "../new-key-dialog";
import { Dynamic } from "solid-js/web";
import { SettingsPage } from "../settings-page";

type AccessLevel = "none" | "read" | "write";
type Resource = "entries" | "collections" | "memberships" | "roles";
type ResourceAccess = Record<Resource, AccessLevel>;

const resources: Array<{ id: Resource; label: string; description: string }> = [
  { id: "entries", label: "Entries", description: "Content entries within collections" },
  { id: "collections", label: "Collections", description: "Collection structure and metadata" },
  { id: "memberships", label: "People", description: "Workspace members and invitations" },
  { id: "roles", label: "Roles", description: "Workspace roles and permissions" }
];

const accessLevels: Array<{ value: AccessLevel; label: string }> = [
  { value: "none", label: "None" },
  { value: "read", label: "Read" },
  { value: "write", label: "Write" }
];

const readPermissionMap: Record<Resource, KeyPermission> = {
  entries: "read:entries",
  collections: "read:collections",
  memberships: "read:memberships",
  roles: "read:roles"
};

const writePermissionMap: Record<Resource, KeyPermission> = {
  entries: "entries",
  collections: "collections",
  memberships: "memberships",
  roles: "roles"
};

const permissionsToAccess = (permissions: KeyPermission[]): ResourceAccess => {
  const access: ResourceAccess = {
    entries: "none",
    collections: "none",
    memberships: "none",
    roles: "none"
  };

  for (const permission of permissions) {
    const resource = permission.startsWith("read:")
      ? (permission.slice(5) as Resource)
      : (permission as Resource);

    if (!resource || !(resource in access)) {
      continue;
    }

    if (permission.startsWith("read:")) {
      if (access[resource] !== "write") {
        access[resource] = "read";
      }
    } else {
      access[resource] = "write";
    }
  }

  return access;
};

const accessToPermissions = (access: ResourceAccess): KeyPermission[] => {
  const permissions: KeyPermission[] = [];

  for (const resource of Object.keys(access) as Resource[]) {
    const level = access[resource];

    if (level === "read") {
      permissions.push(readPermissionMap[resource]);
    } else if (level === "write") {
      permissions.push(writePermissionMap[resource]);
    }
  }

  return permissions;
};

const apiKeyQuery = query((input: { keyID: string }) => {
  return client.keys.get({ id: input.keyID });
}, "api-key");

const KeySettingsPage: Component = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string; keyID?: string }>();
  const keyID = () => params.keyID || null;
  const navigateToAPI = () => navigate(`/${params.workspaceID || ""}/settings/api`);
  const key = createAsync(async () => (keyID() ? apiKeyQuery({ keyID: keyID()! }) : null), {
    deferStream: true
  });
  const [keyName, setKeyName] = createSignal(key()?.name ?? "");
  const [resourceAccess, setResourceAccess] = createSignal<ResourceAccess>(
    permissionsToAccess(key()?.permissions ?? [])
  );
  const [revealedKey, setRevealedKey] = createSignal("");
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
  const createKeyMutation = createMutation(() => ({
    onSuccess: (data) => {
      setRevealedKey(data.rawKey);
      revalidate("api-keys");
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: "Failed to create key"
      });
    },
    mutationFn: (input: { name: string; permissions: KeyPermission[] }) => {
      return client.keys.create(input);
    }
  }));
  const updateKeyMutation = createMutation(() => ({
    onSuccess: () => {
      revalidate(["api-keys", apiKeyQuery.keyFor({ keyID: keyID()! })]);
      navigateToAPI();
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: "Failed to update key"
      });
    },
    mutationFn: async (input: { id: string; name: string; permissions: KeyPermission[] }) => {
      return client.keys.update(input);
    }
  }));

  createEffect(() => {
    const currentKey = key();

    if (currentKey) {
      setKeyName(currentKey.name);
      setResourceAccess(permissionsToAccess(currentKey.permissions));
    }
  });

  return (
    <SettingsPage title={params.keyID ? "Edit key" : "Create key"} parentTitle="API">
      <NewKeyDialog
        key={revealedKey()}
        onClose={() => {
          setRevealedKey("");
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
              class="w-full max-w-md"
            />
          </Setting>
        </SettingsSection>
        <SettingsSection label="Permissions">
          <For each={resources}>
            {(resource) => (
              <Setting label={resource.label} description={resource.description} fade={false} hover>
                <ToggleGroup
                  disabled={createKeyMutation.isPending || updateKeyMutation.isPending}
                  value={resourceAccess()[resource.id]}
                  setValue={(value) => {
                    setResourceAccess((prev) => ({ ...prev, [resource.id]: value as AccessLevel }));
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
              disabled={Boolean(fillError())}
              loading={createKeyMutation.isPending || updateKeyMutation.isPending}
            >
              {Boolean(keyID()) ? "Save changes" : "Create key"}
            </Button>
          </Dynamic>
        </div>
      </div>
    </SettingsPage>
  );
};

export default KeySettingsPage;
