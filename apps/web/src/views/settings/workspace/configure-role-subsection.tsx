import { mdiInformation, mdiKeyChain } from "@mdi/js";
import { Show, For, createResource, Component, createSignal, createEffect } from "solid-js";
import { createStore } from "solid-js/store";
import clsx from "clsx";
import { InputField, TitledCard } from "#components/fragments";
import { Loader, Button } from "#components/primitives";
import { useClient, App, useNotifications } from "#context";

interface ConfigureRoleSubsectionProps {
  editedRoleId?: string;
  setActionComponent(component: Component<{}> | null): void;
  onRoleConfigured(): void;
}

const ConfigureRoleSubsection: Component<ConfigureRoleSubsectionProps> = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [loading, setLoading] = createSignal(false);
  const [editedRoleData] = createResource(() => {
    if (!props.editedRoleId) return null;

    return client.roles.get.query({ id: props.editedRoleId });
  });
  const [roleData, setRoleData] = createStore<Omit<App.Role, "id">>({
    name: "",
    description: "",
    permissions: []
  });
  const permissionsMenu: Array<{
    label: string;
    description: string;
    permission: App.Permission;
  }> = [
    {
      label: "Edit content",
      description: "Edit the content pieces' content",
      permission: "editContent"
    },
    {
      label: "Edit metadata",
      description: "Edit the content pieces' metadata",
      permission: "editMetadata"
    },
    {
      label: "Manage dashboard",
      description: "Manage the kanban dashboard",
      permission: "manageDashboard"
    },
    {
      label: "Manage API tokens",
      description: "Create, edit, and delete API tokens",
      permission: "manageTokens"
    },
    {
      label: "Manage Webhooks",
      description: "Create, edit, and delete webhooks",
      permission: "manageWebhooks"
    },
    {
      label: "Manage Extensions",
      description: "Install, configure, and delete Extensions",
      permission: "manageExtensions"
    },
    {
      label: "Manage Variants",
      description: "Create, edit, and delete Variants",
      permission: "manageVariants"
    },
    {
      label: "Manage workspace",
      description:
        "Manage the workspace settings - including its details, members, roles, and editing experience",
      permission: "manageWorkspace"
    },
    {
      label: "Manage Git",
      description:
        "Setup and manage Git source control - including commits, pull requests, and provider configuration",
      permission: "manageGit"
    }
  ];

  props.setActionComponent(() => (
    <Button
      color="primary"
      class="m-0 flex justify-center items-center"
      disabled={!roleData.name || loading()}
      onClick={async () => {
        setLoading(true);

        try {
          if (props.editedRoleId) {
            await client.roles.update.mutate({
              ...roleData,
              id: props.editedRoleId
            });
          } else {
            await client.roles.create.mutate(roleData);
          }

          setLoading(false);
          notify({
            type: "success",
            text: props.editedRoleId ? "Role updated" : "New role created"
          });
          props.onRoleConfigured();
        } catch (e) {
          setLoading(false);
          notify({
            type: "error",
            text: props.editedRoleId ? "Failed to update the role" : "Failed to create a new role"
          });
        }
      }}
    >
      <span class={clsx(loading() && "invisible")}>
        {props.editedRoleId ? "Update role" : "Create role"}
      </span>
      <Show when={loading()}>
        <Loader class="absolute" />
      </Show>
    </Button>
  ));
  createEffect(() => {
    setRoleData(editedRoleData() || roleData);
  });

  return (
    <>
      <TitledCard icon={mdiInformation} label="Details">
        <Show when={!editedRoleData.loading || !props.editedRoleId} fallback={<Loader />}>
          <InputField
            label="Role name"
            color="contrast"
            placeholder="Name"
            type="text"
            value={roleData.name}
            inputProps={{ maxLength: 20 }}
            setValue={(value) => setRoleData("name", value)}
          />
          <InputField
            label="Description"
            color="contrast"
            textarea
            optional
            placeholder="Role description"
            type="text"
            value={roleData.description || ""}
            setValue={(value) => setRoleData("description", value)}
          >
            Additional details about the role
          </InputField>
        </Show>
      </TitledCard>
      <TitledCard icon={mdiKeyChain} label="Permissions">
        <Show when={!editedRoleData.loading || !props.editedRoleId} fallback={<Loader />}>
          <For each={permissionsMenu}>
            {({ description, label, permission }) => {
              return (
                <InputField
                  type="checkbox"
                  label={label}
                  value={roleData.permissions.includes(permission) || false}
                  setValue={(value) => {
                    if (value) {
                      setRoleData("permissions", (permissions) => [...permissions, permission]);
                    } else {
                      setRoleData("permissions", (permissions) => {
                        return permissions.filter((p) => p !== permission);
                      });
                    }
                  }}
                >
                  {description}
                </InputField>
              );
            }}
          </For>
        </Show>
      </TitledCard>
    </>
  );
};

export { ConfigureRoleSubsection };
