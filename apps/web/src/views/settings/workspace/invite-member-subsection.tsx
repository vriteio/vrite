import { SettingsCard } from "../settings-card";
import { mdiInformation, mdiKeyChain, mdiWalletMembership } from "@mdi/js";
import {
  Show,
  For,
  createResource,
  Component,
  createSignal,
  createEffect,
  createMemo
} from "solid-js";
import { createStore } from "solid-js/store";
import { InputField } from "#components/fragments";
import { Loader, Select, Heading, Button } from "#components/primitives";
import { useClientContext, App, useNotificationsContext } from "#context";
import { validateEmail } from "#lib/utils";

interface InviteMemberSubsectionProps {
  roles: Omit<App.FullRole, "workspaceId">[];
  rolesLoading: boolean;
  setActionComponent(component: Component<{}> | null): void;
  onMemberInvited(): void;
}

const InviteMemberSubsection: Component<InviteMemberSubsectionProps> = (props) => {
  const { client } = useClientContext();
  const { notify } = useNotificationsContext();
  const [loading, setLoading] = createSignal(false);
  const [memberData, setMemberData] = createStore({
    email: "",
    name: "",
    roleId: ""
  });
  const filled = createMemo(() => {
    return (
      memberData.email && memberData.name && memberData.roleId && validateEmail(memberData.email)
    );
  });

  props.setActionComponent(() => (
    <Button
      color="primary"
      class="m-0 flex justify-center items-center"
      loading={loading()}
      disabled={!filled()}
      onClick={async () => {
        setLoading(true);

        try {
          await client.workspaceMemberships.sendInvite.mutate(memberData);
          setLoading(false);
          notify({
            type: "success",
            text: "Invite sent"
          });
          props.onMemberInvited();
        } catch (e) {
          setLoading(false);
          notify({
            type: "error",
            text: "Failed to create a new role"
          });
        }
      }}
    >
      Send invite
    </Button>
  ));
  createEffect(() => {
    setMemberData("roleId", props.roles[0]?.id || "");
  });

  return (
    <>
      <SettingsCard icon={mdiInformation} label="Details">
        <Show when={!props.rolesLoading} fallback={<Loader />}>
          <InputField
            label="Name"
            color="contrast"
            type="text"
            inputProps={{ maxLength: 50 }}
            value={memberData.name}
            setValue={(value) => setMemberData("name", value)}
          >
            How to refer to the new member in the invite?
          </InputField>
          <InputField
            label="Email address"
            color="contrast"
            placeholder="hello@example.com"
            type="text"
            value={memberData.email}
            setValue={(value) => setMemberData("email", value)}
          />
          <div class="flex flex-col justify-center items-start @md:flex-row gap-1 w-full">
            <div class="flex-1">
              <div class="w-full @md:max-w-sm">
                <Heading level={3}>Role</Heading>
                <p class="prose max-w-sm">The default role for this new member</p>
              </div>
            </div>
            <Select
              color="contrast"
              class="w-full m-0"
              wrapperClass="w-full @md:w-auto"
              options={props.roles.map((role) => {
                return {
                  label: role.name,
                  value: role.id
                };
              })}
              setValue={(value) => {
                setMemberData("roleId", value);
              }}
              value={memberData.roleId}
            />
          </div>
        </Show>
      </SettingsCard>
    </>
  );
};

export { InviteMemberSubsection };