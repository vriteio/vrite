import { Button, Checkbox, Input } from "@andesine/components";
import { action, useAction, useSubmission } from "@solidjs/router";
import { Component, createMemo, createSignal, For } from "solid-js";
import { client, Permission } from "#web/lib/client";
import { useNotify } from "#web/context/notifications";

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

const createRoleAction = action(async (input: { name: string; permissions: Permission[] }) => {
  const [error] = await client.roles.create(input);

  if (error) throw error;

  return true;
});

const updateRoleAction = action(
  async (input: { id: string; name: string; permissions: Permission[] }) => {
    const [error] = await client.roles.update(input);

    if (error) throw error;

    return true;
  }
);

interface RoleFormPageBaseProps {
  goBack(): void;
}

interface CreateRoleFormProps extends RoleFormPageBaseProps {
  mode: "create";
  onCreated(): void;
}

interface EditRoleFormProps extends RoleFormPageBaseProps {
  mode: "edit";
  roleId: string;
  initialName: string;
  initialPermissions: Permission[];
  onUpdated(): void;
}

type RoleFormPageProps = CreateRoleFormProps | EditRoleFormProps;

const RoleFormPage: Component<RoleFormPageProps> = (props) => {
  const notify = useNotify();
  const isEdit = () => props.mode === "edit";
  const initial = () =>
    props.mode === "edit"
      ? { name: props.initialName, permissions: props.initialPermissions }
      : { name: "", permissions: [] as Permission[] };
  const createRole = useAction(createRoleAction);
  const updateRole = useAction(updateRoleAction);
  const createSubmission = useSubmission(createRoleAction);
  const updateSubmission = useSubmission(updateRoleAction);

  const [roleName, setRoleName] = createSignal(initial().name);
  const [selectedPermissions, setSelectedPermissions] = createSignal<Permission[]>(
    initial().permissions
  );
  const loading = createMemo(() =>
    props.mode === "edit" ? updateSubmission.pending : createSubmission.pending
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
        await createRole({
          name,
          permissions: selectedPermissions()
        });

        notify({ type: "success", text: "Role created" });
        props.onCreated();
      } else {
        await updateRole({
          id: props.roleId,
          name,
          permissions: selectedPermissions()
        });

        notify({ type: "success", text: "Role updated" });
        props.onUpdated();
      }

      props.goBack();
    } catch (error) {
      notify({
        type: "error",
        text: `Failed to ${isEdit() ? "update" : "create"} role`
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
            placeholder="e.g. Content Manager"
            value={roleName()}
            setValue={setRoleName}
            class="w-full"
            onEnter={() => {
              void handleSubmit();
            }}
          />
        </div>

        {/* Permissions */}
        <div class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">Permissions</span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              Select permissions to grant to this role
            </span>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {selectedPermissionCount() === 0
                ? "No permissions selected"
                : `${selectedPermissionCount()} permission${selectedPermissionCount() === 1 ? "" : "s"} selected`}
            </span>
          </div>
          <div class="flex flex-col gap-2">
            <For each={permissions}>
              {(perm) => {
                const active = () => selectedPermissions().includes(perm.id);

                return (
                  <button
                    type="button"
                    disabled={loading()}
                    class="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-3 py-2.5 text-left transition-colors hover:bg-gray-100 dark:bg-gray-900/60 dark:hover:bg-gray-900"
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
              : "Create role"}
        </Button>
      </div>
    </div>
  );
};

export { RoleFormPage };
export type { Permission };
