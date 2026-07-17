import { Button, Checkbox, Input } from "@andesine/components";
import { Component, createMemo, createSignal, For } from "solid-js";
import { client, Permission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";
import { createMutation } from "@tanstack/solid-query";
import { Setting } from "../../setting";
import { SettingsSection } from "../../settings-section";

// TODO: Move to a shared file with the backend
const permissions: Array<{ id: Permission; label: string; description: string }> = [
  {
    id: "content",
    label: "Manage Content",
    description: "Create, edit, and delete entries and collections"
  },
  {
    id: "api_keys",
    label: "Manage API Keys",
    description: "Create, rotate, and delete API keys"
  },
  {
    id: "billing",
    label: "Manage Billing",
    description: "Access billing, manage subscriptions and payments"
  },
  {
    id: "workspace",
    label: "Manage Workspace",
    description: "Manage workspace settings, roles, and members"
  }
];

interface RoleFormPageBaseProps {
  goBack(): void;
}

interface CreateRoleFormProps extends RoleFormPageBaseProps {
  mode: "create";
  onCreated(): Promise<void> | void;
}

interface EditRoleFormProps extends RoleFormPageBaseProps {
  mode: "edit";
  roleId: string;
  initialName: string;
  initialPermissions: Permission[];
  onUpdated(): Promise<void> | void;
}

type RoleFormPageProps = CreateRoleFormProps | EditRoleFormProps;

const RoleFormPage: Component<RoleFormPageProps> = (props) => {
  const notify = useNotify();
  const isEdit = () => props.mode === "edit";
  const initial = () =>
    props.mode === "edit"
      ? { name: props.initialName, permissions: props.initialPermissions }
      : { name: "", permissions: [] as Permission[] };
  const createRoleMutation = createMutation(() => ({
    mutationFn: async (input: { name: string; permissions: Permission[] }) => {
      await client.roles.create(input);

      return true;
    }
  }));
  const updateRoleMutation = createMutation(() => ({
    mutationFn: async (input: { id: string; name: string; permissions: Permission[] }) => {
      await client.roles.update(input);

      return true;
    }
  }));

  const [roleName, setRoleName] = createSignal(initial().name);
  const [selectedPermissions, setSelectedPermissions] = createSignal<Permission[]>(
    initial().permissions
  );
  const loading = createMemo(() =>
    props.mode === "edit" ? updateRoleMutation.isPending : createRoleMutation.isPending
  );
  const selectedPermissionCount = createMemo(() => selectedPermissions().length);

  const togglePermission = (perm: Permission) => {
    if (loading()) return;

    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async () => {
    const name = roleName().trim();

    if (!name) {
      notify({ type: "error", text: "Role name is required" });
      return;
    }

    try {
      if (props.mode === "create") {
        await createRoleMutation.mutateAsync({
          name,
          permissions: selectedPermissions()
        });

        notify({ type: "success", text: "Role created" });
        await props.onCreated();
      } else {
        await updateRoleMutation.mutateAsync({
          id: props.roleId,
          name,
          permissions: selectedPermissions()
        });

        notify({ type: "success", text: "Role updated" });
        await props.onUpdated();
      }

      props.goBack();
    } catch (error) {
      notify({
        type: "error",
        text:
          error instanceof Error && error.message
            ? error.message
            : `Failed to ${isEdit() ? "update" : "create"} role`
      });
    }
  };

  return (
    <div class="flex min-w-0 flex-col">
      <SettingsSection label="Role details">
        <Setting label="Name" description="A clear name workspace members will recognize">
          <Input
            placeholder="e.g. Content Manager"
            value={roleName()}
            setValue={setRoleName}
            class="w-full max-w-md"
            onEnter={() => {
              handleSubmit();
            }}
          />
        </Setting>
      </SettingsSection>
      <SettingsSection label="Access">
        <Setting
          label="Permissions"
          description={`${selectedPermissionCount()} permission${selectedPermissionCount() === 1 ? "" : "s"} selected`}
        >
          <div class="flex w-full flex-col gap-2">
            <For each={permissions}>
              {(perm) => {
                const active = () => selectedPermissions().includes(perm.id);

                return (
                  <button
                    type="button"
                    disabled={loading()}
                    class="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-900"
                    onClick={() => togglePermission(perm.id)}
                  >
                    <div class="flex flex-col gap-0.5 min-w-0">
                      <span class="text-sm font-medium leading-none">{perm.label}</span>
                      <span class="text-xs text-gray-400 dark:text-gray-500 leading-none">
                        {perm.description}
                      </span>
                    </div>
                    <Checkbox size="small" checked={active()} disabled={loading()} />
                  </button>
                );
              }}
            </For>
          </div>
        </Setting>
      </SettingsSection>
      <SettingsSection label="Actions">
        <Setting
          label={isEdit() ? "Save role" : "Create role"}
          description="Apply this name and permission set to the workspace role"
        >
          <div class="flex w-full justify-end gap-2">
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
                  : "Create role"}
            </Button>
          </div>
        </Setting>
      </SettingsSection>
    </div>
  );
};

export { RoleFormPage };
export type { Permission };
