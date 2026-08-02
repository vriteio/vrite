import { Button, Fragment, IconButton, Input, ToggleGroup, Tooltip } from "@andesine/components";
import { createAsync, query, revalidate, useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { Component, createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

import { useNotify } from "#web/context/notifications";
import { client, type Permission } from "#web/lib/client";
import { Setting } from "../setting";
import { SettingsSection } from "../settings-section";

type AccessLevel = "default" | "read" | "write";
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
const emptyAccess = (): ResourceAccess => ({
  api_keys: "default",
  billing: "default",
  content: "default",
  workspace: "default"
});
const permissionsToAccess = (permissions: Permission[]): ResourceAccess => {
  const access = emptyAccess();

  for (const permission of permissions) {
    const readOnly = permission.startsWith("read:");
    const resource = (readOnly ? permission.slice(5) : permission) as Resource;

    if (!(resource in access)) continue;
    if (!readOnly || access[resource] !== "write") {
      access[resource] = readOnly ? "read" : "write";
    }
  }

  return access;
};
const accessToPermissions = (access: ResourceAccess): Permission[] => {
  return (Object.keys(access) as Resource[]).flatMap((resource) => {
    if (access[resource] === "write") return [resource as Permission];
    if (access[resource] === "read") return [`read:${resource}` as Permission];

    return [];
  });
};

const membershipsQuery = query(() => client.memberships.list(), "memberships");
const rolesQuery = query(() => client.roles.list(), "roles");

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
  const createRoleMutation = createMutation(() => ({
    mutationFn: (input: { name: string; permissions: Permission[] }) => client.roles.create(input),
    onSuccess: async () => {
      await revalidate(rolesQuery.key);
      notify({ type: "success", text: "Role created" });
      navigateToPeople();
    },
    onError: (error) => {
      const duplicateName =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ROLE_NAME_DUPLICATE";

      if (duplicateName) {
        setRoleNameServerError("A role with this name already exists");
      }

      console.error(error);
      notify({
        type: "error",
        text: duplicateName ? "A role with this name already exists" : "Failed to create role"
      });
    }
  }));
  const updateRoleMutation = createMutation(() => ({
    mutationFn: (input: { id: string; name: string; permissions: Permission[] }) => {
      return client.roles.update(input);
    },
    onSuccess: async () => {
      await revalidate([rolesQuery.key, membershipsQuery.key]);
      notify({ type: "success", text: "Role updated" });
      navigateToPeople();
    },
    onError: (error) => {
      console.error(error);
      const duplicateName =
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ROLE_NAME_DUPLICATE";

      if (duplicateName) setRoleNameServerError("A role with this name already exists");
      notify({
        type: "error",
        text: duplicateName ? "A role with this name already exists" : "Failed to update role"
      });
    }
  }));
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
          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
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
