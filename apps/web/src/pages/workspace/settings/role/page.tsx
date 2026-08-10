import { Button, Fragment, IconButton, Input, ToggleGroup, Tooltip } from "@andesine/components";
import { createAsync, useNavigate, useParams } from "@solidjs/router";
import { type Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useNotify } from "#web/context/notifications";
import { type Permission } from "#web/lib/api";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";
import { rolesQuery, useRoleMutations } from "#web/lib/data";
import { type AccessLevel, createPermissionAccessMapper } from "#web/lib/permissions";

type Resource = "api_keys" | "billing" | "content" | "workspace";
type ResourceAccess = Record<Resource, AccessLevel>;

const resources: Array<{
  description: string;
  id: Resource;
  label: string;
  defaultView?: boolean;
}> = [
  {
    id: "content",
    label: "Content",
    description: "Create, edit, and delete entries and collections",
    defaultView: true
  },
  {
    id: "api_keys",
    label: "API keys",
    description: "View or manage workspace API credentials"
  },
  {
    id: "billing",
    label: "Billing",
    description: "View or manage subscriptions and payments"
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Manage workspace settings, roles, and members",
    defaultView: true
  }
];
const { accessToPermissions, emptyAccess, permissionsToAccess } = createPermissionAccessMapper<
  Resource,
  Permission
>({
  resources: [
    { id: "api_keys", read: "read:api_keys", write: "api_keys" },
    { id: "billing", read: "read:billing", write: "billing" },
    { id: "content", write: "content" },
    { id: "workspace", write: "workspace" }
  ]
});

const RoleSettingsPage: Component = () => {
  const notify = useNotify();
  const navigate = useNavigate();
  const params = useParams<{ workspaceID?: string; roleID?: string }>();
  const roleID = () => params.roleID || null;
  const navigateToPeople = () => navigate(`/${params.workspaceID || ""}/settings/people`);
  const roles = createAsync(
    async () => {
      try {
        return await rolesQuery();
      } catch (error) {
        console.error(error);

        return null;
      }
    },
    { deferStream: true }
  );
  const currentRole = createMemo(() => {
    return roleID() ? roles()?.find((role) => role.id === roleID()) : null;
  });
  const [roleName, setRoleName] = createSignal("");
  const [roleNameServerError, setRoleNameServerError] = createSignal("");
  const { createRoleMutation, updateRoleMutation } = useRoleMutations({
    navigateToPeople,
    setDuplicateNameError: setRoleNameServerError
  });
  const [resourceAccess, setResourceAccess] = createSignal<ResourceAccess>(emptyAccess());
  const formUnavailable = createMemo(() => {
    const role = currentRole();

    return Boolean(roleID() && roles() && (!role || role.baseRole));
  });
  const roleNameError = createMemo(() => {
    if (!roleName().trim()) return "Role name is required";
    if (roleName().trim().length > 50) return "Role name must be 50 characters or fewer";
    const normalizedName = roleName().trim().toLowerCase();
    const duplicate = roles()?.some((role) => {
      return role.id !== roleID() && role.name.trim().toLowerCase() === normalizedName;
    });

    if (duplicate) return "A role with this name already exists";

    return roleNameServerError();
  });
  const fillError = createMemo(() => {
    if (roleID() && roles() && !currentRole()) return "Role could not be found";
    if (currentRole()?.baseRole) return "System roles cannot be edited";
    if (roleNameError()) return roleNameError();

    return "";
  });
  const mutationPending = () => createRoleMutation.isPending || updateRoleMutation.isPending;

  createEffect(() => {
    const availableRoles = roles();
    const role = currentRole();

    if (roleID() && availableRoles !== undefined && (!role || role.baseRole)) {
      const text =
        availableRoles === null
          ? "Role is unavailable"
          : role?.baseRole
            ? "System roles cannot be edited"
            : "Role not found";

      notify({ type: "error", text });
      navigate(`/${params.workspaceID || ""}/settings/people`, { replace: true });

      return;
    }

    if (role) {
      setRoleName(role.name);
      setResourceAccess(permissionsToAccess(role.permissions));
    }
  });

  return (
    <>
      <div class="flex min-w-0 flex-col">
        <SettingsSection label="Role details">
          <Setting
            label="Name"
            description="A clear name workspace members will recognize"
            fade={false}
          >
            <Input
              maxlength={50}
              placeholder="Content manager"
              variant="outlined"
              color="contrast"
              size="small"
              value={roleName()}
              setValue={(name) => {
                setRoleName(name);
                setRoleNameServerError("");
              }}
              class="min-w-0"
              slotWrapperClass="w-full max-w-md"
              slot={() => (
                <Show when={roleNameError()}>
                  {(error) => (
                    <div class="absolute right-2">
                      <Tooltip content={error()} side="top">
                        <div
                          class="i-lucide:triangle-alert h-4.5 w-4.5 text-red-500"
                          title={error()}
                          aria-label={error()}
                          tabindex="0"
                        />
                      </Tooltip>
                    </div>
                  )}
                </Show>
              )}
              disabled={formUnavailable() || mutationPending()}
            />
          </Setting>
        </SettingsSection>
        <SettingsSection label="Permissions">
          <For each={resources}>
            {(resource) => (
              <Setting label={resource.label} description={resource.description} fade={false} hover>
                <ToggleGroup
                  disabled={formUnavailable() || mutationPending()}
                  value={resourceAccess()[resource.id]}
                  setValue={(value) => {
                    setResourceAccess((previous) => ({
                      ...previous,
                      [resource.id]: value as AccessLevel
                    }));
                  }}
                  options={
                    resource.defaultView === true
                      ? [
                          { value: "default", label: "View" },
                          { value: "write", label: "Manage" }
                        ]
                      : [
                          { value: "default", label: "None" },
                          { value: "read", label: "View" },
                          { value: "write", label: "Manage" }
                        ]
                  }
                />
              </Setting>
            )}
          </For>
        </SettingsSection>
        <div class="flex h-4 w-full items-center justify-center">
          <div class="h-px flex-1 bg-gray-200" />
        </div>
        <div class="flex items-center justify-end gap-2">
          <Tooltip content="Go back">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:chevron-left"
              onClick={navigateToPeople}
              disabled={mutationPending()}
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
              class="flex w-full items-center justify-center gap-1"
              disabled={Boolean(fillError())}
              loading={mutationPending()}
              onClick={() => {
                const input = {
                  name: roleName().trim(),
                  permissions: accessToPermissions(resourceAccess())
                };

                if (roleID()) {
                  updateRoleMutation.mutate({ id: roleID()!, ...input });
                } else {
                  createRoleMutation.mutate(input);
                }
              }}
            >
              {roleID() ? "Save changes" : "Create role"}
            </Button>
          </Dynamic>
        </div>
      </div>
    </>
  );
};

export default RoleSettingsPage;
