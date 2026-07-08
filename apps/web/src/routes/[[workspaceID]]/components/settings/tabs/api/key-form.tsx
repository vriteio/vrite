import { Button, Input, ToggleGroup } from "@andesine/components";
import { Component, createMemo, createSignal, For } from "solid-js";
import { client, type KeyPermission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { createMutation } from "@tanstack/solid-query";

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

const permissionsToAccess = (perms: KeyPermission[]): ResourceAccess => {
  const acc: ResourceAccess = {
    entries: "none",
    collections: "none",
    memberships: "none",
    roles: "none"
  };

  for (const perm of perms) {
    const resource = perm.startsWith("read:") ? (perm.slice(5) as Resource) : (perm as Resource);

    if (!resource || !(resource in acc)) {
      continue;
    }

    if (perm.startsWith("read:")) {
      if (acc[resource] !== "write") {
        acc[resource] = "read";
      }
    } else {
      acc[resource] = "write";
    }
  }

  return acc;
};

const accessToPermissions = (acc: ResourceAccess): KeyPermission[] => {
  const perms: KeyPermission[] = [];

  for (const resource of Object.keys(acc) as Resource[]) {
    const level = acc[resource];

    if (level === "read") {
      perms.push(readPermissionMap[resource]);
    } else if (level === "write") {
      perms.push(writePermissionMap[resource]);
    }
  }

  return perms;
};

const emptyAccess = (): ResourceAccess => ({
  entries: "none",
  collections: "none",
  memberships: "none",
  roles: "none"
});

// ── Component ─────────────────────────────────────────────────────────────────
interface KeyFormPageBaseProps {
  goBack(): void;
}

interface CreateKeyFormProps extends KeyFormPageBaseProps {
  mode: "create";
  onCreated(rawKey: string): void;
}

interface EditKeyFormProps extends KeyFormPageBaseProps {
  mode: "edit";
  keyId: string;
  initialName: string;
  initialPermissions: KeyPermission[];
  onUpdated(): void;
}

type KeyFormPageProps = CreateKeyFormProps | EditKeyFormProps;

const KeyFormPage: Component<KeyFormPageProps> = (props) => {
  const notify = useNotify();
  const isEdit = () => props.mode === "edit";
  const initial = () =>
    props.mode === "edit"
      ? { name: props.initialName, access: permissionsToAccess(props.initialPermissions) }
      : { name: "", access: emptyAccess() };
  const createKeyMutation = createMutation(() => ({
    mutationFn: (input: { name: string; permissions: KeyPermission[] }) => client.keys.create(input)
  }));
  const updateKeyMutation = createMutation(() => ({
    mutationFn: async (input: { id: string; name: string; permissions: KeyPermission[] }) => {
      await client.keys.update(input);

      return true;
    }
  }));

  const [keyName, setKeyName] = createSignal(initial().name);
  const [resourceAccess, setResourceAccess] = createSignal<ResourceAccess>(initial().access);
  const loading = createMemo(() =>
    props.mode === "edit" ? updateKeyMutation.isPending : createKeyMutation.isPending
  );
  const selectedPermissionCount = createMemo(() => accessToPermissions(resourceAccess()).length);

  const setAccess = (resource: Resource, level: AccessLevel) => {
    if (loading()) return;

    setResourceAccess((prev) => ({ ...prev, [resource]: level }));
  };

  const handleSubmit = async () => {
    const name = keyName().trim();

    if (!name) {
      notify({ type: "error", text: "Key name is required" });
      return;
    }

    const permissions = accessToPermissions(resourceAccess());

    if (permissions.length === 0) {
      notify({ type: "error", text: "Grant at least one permission" });
      return;
    }

    try {
      if (props.mode === "create") {
        const data = await createKeyMutation.mutateAsync({ name, permissions });

        notify({ type: "success", text: "API key created" });
        props.onCreated(data.rawKey);
      } else {
        await updateKeyMutation.mutateAsync({
          id: props.keyId,
          name,
          permissions
        });

        notify({ type: "success", text: "API key updated" });
        props.onUpdated();
      }

      props.goBack();
    } catch (error) {
      notify({
        type: "error",
        text: `Failed to ${isEdit() ? "update" : "create"} API key`
      });
    }
  };

  return (
    <div class="flex flex-col gap-4 h-full">
      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <div class="flex flex-col gap-5 flex-1">
        {/* Name */}
        <div class="flex flex-col gap-1.5">
          <label class="text-sm font-medium">Name</label>
          <Input
            placeholder="e.g. CI/CD pipeline"
            value={keyName()}
            setValue={setKeyName}
            class="w-full"
            onEnter={() => {
              handleSubmit();
            }}
          />
        </div>

        {/* Permissions */}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">Permissions</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              Set the access level for each resource
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {selectedPermissionCount() === 0
                ? "No permissions selected"
                : `${selectedPermissionCount()} permission${selectedPermissionCount() === 1 ? "" : "s"} selected`}
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <For each={resources}>
              {(resource) => (
                <div class="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2.5 dark:bg-gray-900/60">
                  {/* Resource info */}
                  <div class="flex flex-col gap-0.5 min-w-0">
                    <span class="text-sm font-medium leading-none">{resource.label}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 leading-none">
                      {resource.description}
                    </span>
                  </div>

                  {/* Access level toggle */}
                  <ToggleGroup
                    disabled={loading()}
                    value={resourceAccess()[resource.id]}
                    setValue={(value) => setAccess(resource.id, value as AccessLevel)}
                    options={accessLevels.map((option) => ({
                      value: option.value,
                      label: option.label
                    }))}
                    class="shrink-0"
                  />
                </div>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div class="flex justify-end gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
        <Button
          variant="outlined"
          text="soft"
          size="small"
          onClick={props.goBack}
          disabled={loading()}
        >
          Cancel
        </Button>
        <Button
          color="primary"
          variant="solid"
          size="small"
          onClick={handleSubmit}
          disabled={loading()}
        >
          {loading()
            ? isEdit()
              ? "Saving..."
              : "Creating..."
            : isEdit()
              ? "Save changes"
              : "Create key"}
        </Button>
      </div>
    </div>
  );
};

export { KeyFormPage };
export type { KeyPermission };
