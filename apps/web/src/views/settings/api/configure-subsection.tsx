import { ConfigureTokenAction } from "./configure-action";
import { mdiInformation, mdiKeyChain } from "@mdi/js";
import { Component, For, Show, createEffect, createResource } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, CollapsibleSection } from "#components/fragments";
import { Select, Heading, Loader } from "#components/primitives";
import { useClient, App } from "#context";

interface FreshToken {
  id: string;
  token: string;
  name: string;
}
interface ConfigureTokenSubSectionProps {
  editedTokenId: string;
  setActionComponent(component: Component<{}> | null): void;
  onTokenConfigured(token: FreshToken | null): void;
}

const ConfigureTokenSubSection: Component<ConfigureTokenSubSectionProps> = (props) => {
  const client = useClient();
  const [editedTokenData] = createResource(() => {
    if (!props.editedTokenId) return null;

    return client.tokens.get.query({ id: props.editedTokenId });
  });
  const [tokenData, setTokenData] = createStore<Omit<App.Token, "id">>({
    name: "",
    description: "",
    permissions: []
  });
  const permissionsMenu: Array<{
    label: string;
    description: string;
    permissions: App.TokenPermission[];
  }> = [
    {
      label: "Content pieces",
      description:
        "Access the JSON content and manage detailed content piece metadata (including tags)",
      permissions: ["contentPieces:read", "contentPieces:write"]
    },
    {
      label: "Content groups",
      description: "Access and manage content groups and the IDs of related content pieces",
      permissions: ["contentGroups:read", "contentGroups:write"]
    },
    {
      label: "Tags",
      description: "Access and manage tags",
      permissions: ["tags:read", "tags:write"]
    },
    {
      label: "User settings",
      description: "Access and manage your personal UI settings",
      permissions: ["userSettings:read", "userSettings:write"]
    },
    {
      label: "Roles",
      description: "Access and manage roles in the workspace",
      permissions: ["roles:read", "roles:write"]
    },
    {
      label: "Webhooks",
      description: "Access and manage Webhooks",
      permissions: ["webhooks:read", "webhooks:write"]
    },
    {
      label: "Variants",
      description: "Access and manage registered Variants",
      permissions: ["variants:read", "variants:write"]
    },
    {
      label: "Profile",
      description: "Access your personal profile settings",
      permissions: ["profile:read"]
    },
    {
      label: "Workspace members",
      description: "Access and manage workspace members",
      permissions: ["workspaceMemberships:read", "workspaceMemberships:write"]
    },
    {
      label: "Workspace",
      description: "Access workspace profile and manage its editing settings",
      permissions: ["workspace:read", "workspace:write"]
    }
  ];

  createEffect(async () => {
    if (editedTokenData()) {
      setTokenData((tokenData) => editedTokenData() || tokenData);
    }
  });
  props.setActionComponent(() => {
    return (
      <ConfigureTokenAction
        editedTokenId={props.editedTokenId}
        onTokenConfigured={props.onTokenConfigured}
        tokenData={tokenData}
      />
    );
  });

  return (
    <>
      <CollapsibleSection icon={mdiInformation} label="Details">
        <Show
          when={!editedTokenData.loading || !props.editedTokenId}
          fallback={
            <div class="flex justify-center items-center w-full">
              <Loader />
            </div>
          }
        >
          <InputField
            label="API token name"
            placeholder="Name"
            type="text"
            value={tokenData.name}
            inputProps={{ maxLength: 50 }}
            setValue={(value) => setTokenData("name", value)}
          />
          <InputField
            label="Description"
            textarea
            optional
            placeholder="API token description"
            type="text"
            value={tokenData.description}
            setValue={(value) => setTokenData("description", value)}
          >
            Additional details about the API token
          </InputField>
        </Show>
      </CollapsibleSection>
      <CollapsibleSection icon={mdiKeyChain} label="Permissions">
        <Show
          when={!editedTokenData.loading || !props.editedTokenId}
          fallback={
            <div class="flex justify-center items-center w-full">
              <Loader />
            </div>
          }
        >
          <For each={permissionsMenu}>
            {({ description, label, permissions }) => {
              const getOptions = (): Array<{ label: string; value: string }> => {
                return [
                  ...permissions.map((permission) => {
                    const [name, accessLevel] = permission.split(":");

                    return {
                      label: accessLevel,
                      value: accessLevel
                    };
                  }),
                  { label: "no access", value: "none" }
                ];
              };
              const getAccessLevel = (): "read" | "write" | "none" => {
                const grantedAccessLevel = permissions.map((permission) => {
                  if (tokenData.permissions.includes(permission)) {
                    const [name, accessLevel] = permission.split(":");

                    return accessLevel;
                  }

                  return "none";
                });

                if (grantedAccessLevel.includes("write")) {
                  return "write";
                } else if (grantedAccessLevel.includes("read")) {
                  return "read";
                }

                return "none";
              };

              return (
                <div class="flex flex-col justify-center items-start @xl:flex-row gap-1 w-full">
                  <div class="flex flex-col gap-1 w-full @xl:max-w-sm">
                    <Heading level={3}>{label}</Heading>
                    <p class="prose text-gray-500 dark:text-gray-400">{description}</p>
                  </div>
                  <div class="flex-1" />
                  <Select
                    wrapperClass="w-full @xl:w-auto"
                    class="w-full m-0 capitalize"
                    options={getOptions()}
                    setValue={(value) => {
                      setTokenData("permissions", (grantedPermissions) => {
                        if (value === "none") {
                          return grantedPermissions.filter((grantedPermission) => {
                            return !permissions.includes(grantedPermission);
                          });
                        }

                        return [
                          ...grantedPermissions.filter((grantedPermission) => {
                            return !permissions.includes(grantedPermission);
                          }),
                          ...permissions.filter((permission) => {
                            if (value === "read") {
                              return permission.endsWith("read");
                            }

                            return permission.endsWith("write") || permission.endsWith("read");
                          })
                        ];
                      });
                    }}
                    value={getAccessLevel()}
                  />
                </div>
              );
            }}
          </For>
        </Show>
      </CollapsibleSection>
    </>
  );
};

export { ConfigureTokenSubSection };
export type { FreshToken };
