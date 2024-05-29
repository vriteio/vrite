import { SettingsSectionComponent } from "./view";
import { mdiCheck, mdiEmail, mdiEye, mdiEyeOff, mdiLock } from "@mdi/js";
import { Show, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import { InputField, CollapsibleSection } from "#components/fragments";
import { Button, IconButton, Loader, Tooltip } from "#components/primitives";
import { validatePassword } from "#lib/utils";
import { App, useClient, useNotifications } from "#context";

const SecuritySection: SettingsSectionComponent = () => {
  const client = useClient();
  const { notify } = useNotifications();
  const [newPassword, setNewPassword] = createSignal("");
  const [oldPassword, setOldPassword] = createSignal("");
  const [hideOldPassword, setHideOldPassword] = createSignal(true);
  const [hideNewPassword, setHideNewPassword] = createSignal(true);
  const filled = createMemo(() => {
    return oldPassword() && newPassword() && validatePassword(newPassword());
  });
  const [profile, { mutate }] = createResource(() => {
    return client.users.get.query();
  });
  const handleUpdatePassword = async (): Promise<void> => {
    try {
      await client.auth.changePassword.mutate({
        newPassword: newPassword(),
        oldPassword: oldPassword()
      });
      notify({ type: "success", text: "Password updated" });
    } catch (error) {
      const clientError = error as App.ClientError;

      if (clientError.data.cause?.code === "invalid") {
        notify({ type: "error", text: "Old password invalid" });
      }
    }
  };
  const userChanges = client.users.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update") {
        if (!profile()) return;

        mutate((profile) => ({ ...profile!, ...data }));
      }
    }
  });

  onCleanup(() => {
    userChanges.unsubscribe();
  });

  return (
    <>
      <Show when={profile()?.passwordChangeInVerification}>
        <CollapsibleSection gradient icon={mdiEmail} label="Verify password change">
          <p class="prose w-full">Verify password change by following the link in your inbox.</p>
        </CollapsibleSection>
      </Show>
      <CollapsibleSection
        icon={mdiLock}
        label="Change password"
        action={
          <>
            <Button
              color="primary"
              disabled={!filled()}
              class="m-0 hidden @md:flex"
              onClick={handleUpdatePassword}
            >
              Update password
            </Button>
            <Tooltip text="Update password" wrapperClass="flex @md:hidden" class="mt-1" fixed>
              <IconButton
                path={mdiCheck}
                class="m-0"
                color="primary"
                disabled={!filled()}
                onClick={handleUpdatePassword}
              />
            </Tooltip>
          </>
        }
      >
        <Show
          when={!profile.loading}
          fallback={
            <div class="flex justify-center items-center w-full">
              <Loader />
            </div>
          }
        >
          <div class="prose w-full text-gray-500 dark:text-gray-400">
            You'll receive an email to verify and confirm the password change.
          </div>
          <InputField
            label="Old password"
            type="text"
            value={oldPassword()}
            setValue={setOldPassword}
            inputProps={{ type: hideOldPassword() ? "password" : "text" }}
            adornment={() => {
              return (
                <Tooltip text={hideOldPassword() ? "Show password" : "Hide password"} class="mt-1">
                  <IconButton
                    path={hideOldPassword() ? mdiEye : mdiEyeOff}
                    class="m-0 ml-2"
                    text="soft"
                    onClick={() => {
                      setHideOldPassword(!hideOldPassword());
                    }}
                  />
                </Tooltip>
              );
            }}
          />
          <InputField
            label="New password"
            type="text"
            value={newPassword()}
            setValue={setNewPassword}
            inputProps={{ type: hideNewPassword() ? "password" : "text" }}
            adornment={() => {
              return (
                <Tooltip text={hideNewPassword() ? "Show password" : "Hide password"} class="mt-1">
                  <IconButton
                    path={hideNewPassword() ? mdiEye : mdiEyeOff}
                    class="m-0 ml-2"
                    text="soft"
                    onClick={() => {
                      setHideNewPassword(!hideNewPassword());
                    }}
                  />
                </Tooltip>
              );
            }}
          >
            Min. 8 characters, including a number, and a lowercase letter.
          </InputField>
        </Show>
      </CollapsibleSection>
    </>
  );
};

export { SecuritySection };
