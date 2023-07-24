import { SettingsSectionComponent } from "./view";
import { SettingsImageUpload } from "./image-upload";
import { mdiAlert, mdiArrowRightThin, mdiCardAccountDetails, mdiInformation } from "@mdi/js";
import { Show, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";
import { InputField, TitledCard } from "#components/fragments";
import { Button, Loader, Heading, IconButton } from "#components/primitives";
import { App, useClient, useNotifications } from "#context";
import { validateEmail, validateUsername } from "#lib/utils";

const ProfileSection: SettingsSectionComponent = (props) => {
  const client = useClient();
  const { notify } = useNotifications();
  const [initialLoad, setInitialLoad] = createSignal(true);
  const [loading, setLoading] = createSignal(false);
  const [edited, setEdited] = createSignal(false);
  const [existingProfileData, { refetch }] = createResource(async () => {
    const result = await client.users.get.query();

    setInitialLoad(false);

    return result;
  });
  const [profileData, setProfileData] = createStore<App.Profile & App.VerificationDetails>({
    id: "",
    avatar: "",
    bio: "",
    username: "",
    fullName: "",
    email: "",
    newEmailChangeInVerification: false,
    oldEmailChangeInVerification: false,
    passwordChangeInVerification: false,
    emailInVerification: false
  });
  const filled = createMemo(() => {
    return (
      profileData.email &&
      profileData.username &&
      validateEmail(profileData.email) &&
      validateUsername(profileData.username)
    );
  });
  const handleProfileDataChange = (key: keyof App.Profile, value: string): void => {
    if (profileData[key] !== value) setEdited(true);

    setProfileData(key, value);
  };
  const usersChanges = client.users.changes.subscribe(undefined, {
    onData({ action, data }) {
      if (action === "update") {
        setProfileData(data);
      }
    }
  });

  createEffect(() => {
    if (existingProfileData()) {
      setProfileData((profileData) => existingProfileData() || profileData);
    }
  });
  props.setActionComponent(() => {
    return (
      <Button
        color="primary"
        class="m-0 flex justify-center items-center"
        disabled={!edited() || !filled()}
        loading={loading()}
        onClick={async () => {
          setLoading(true);

          try {
            await client.users.update.mutate(profileData);
            notify({
              type: "success",
              text: "Profile updated"
            });
            refetch();
            setEdited(false);
          } catch (e) {
            notify({
              type: "error",
              text: "Failed to update profile"
            });
          } finally {
            setLoading(false);
          }
        }}
      >
        Update
      </Button>
    );
  });
  onCleanup(() => {
    usersChanges.unsubscribe();
  });

  return (
    <>
      <Show
        when={profileData.newEmailChangeInVerification || profileData.oldEmailChangeInVerification}
      >
        <TitledCard icon={mdiAlert} label="Email changed" gradient>
          Email change verification is in progress. Please check your the inbox of your old and new
          email address for verification.
        </TitledCard>
      </Show>
      <TitledCard icon={mdiInformation} label="About you">
        <Show when={!existingProfileData.loading || !initialLoad()} fallback={<Loader />}>
          <div class="flex w-full gap-4 justify-center items-center">
            <SettingsImageUpload
              disabled={loading()}
              url={profileData.avatar || ""}
              label="Avatar"
              onUpload={(url) => {
                handleProfileDataChange("avatar", url);
              }}
            />
            <div class="flex-1">
              <InputField
                type="text"
                color="contrast"
                label="Full Name"
                value={profileData.fullName || ""}
                inputProps={{ maxLength: 50 }}
                setValue={(value) => handleProfileDataChange("fullName", value)}
              />
            </div>
          </div>
          <InputField
            type="text"
            color="contrast"
            label="Bio"
            textarea
            value={profileData.bio || ""}
            setValue={(value) => handleProfileDataChange("bio", value)}
            placeholder="Tell us about yourself"
            disabled={loading()}
          >
            Some interesting details about you
          </InputField>
        </Show>
      </TitledCard>
      <TitledCard icon={mdiCardAccountDetails} label="Credentials">
        <Show when={!existingProfileData.loading || !initialLoad()} fallback={<Loader />}>
          <InputField
            label={
              <div class="flex w-full justify-center items-center">
                <span class="flex-1">Email address</span>
                <Show
                  when={
                    profileData.newEmailChangeInVerification ||
                    profileData.oldEmailChangeInVerification
                  }
                >
                  <Button
                    size="small"
                    color="contrast"
                    badge
                    hover={false}
                    class="m-0 font-normal"
                    text="soft"
                  >
                    Pending email verification
                  </Button>
                </Show>
              </div>
            }
            placeholder="hello@example.com"
            color="contrast"
            type="text"
            value={profileData.email || ""}
            setValue={(value) => handleProfileDataChange("email", value)}
            disabled={loading()}
          >
            Upon update we'll send an email to both your new and previous inboxes to verify the
            change.
          </InputField>
          <InputField
            label="Username"
            placeholder="user_name"
            color="contrast"
            type="text"
            value={profileData.username || ""}
            setValue={(value) => handleProfileDataChange("username", value)}
            inputProps={{ maxLength: 20 }}
            disabled={loading()}
          >
            Can only contain lowercase letters, numbers, and underscores.
          </InputField>
          <div class="flex flex-col gap-1 w-full justify-center items-start">
            <Heading level={3}>Password</Heading>
            <p class="prose text-gray-500 dark:text-gray-400">
              You can change your password in the Security settings
            </p>
            <IconButton
              color="contrast"
              text="soft"
              path={mdiArrowRightThin}
              class="flex-row-reverse gap-1 m-0"
              onClick={() => props.setSection("security")}
              label="Go to Security settings"
            />
          </div>
        </Show>
      </TitledCard>
    </>
  );
};

export { ProfileSection };
