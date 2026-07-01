import { Component, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import { SettingsSection } from "../../settings-section";
import { Input } from "@andesine/components";
import { Setting } from "../../setting";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useAction, useSubmission, revalidate, action } from "@solidjs/router";
import { authClient } from "#web/lib/client";

interface ProfileSectionProps {
  opened?: boolean;
}

const updateProfileNameAction = action(async (input: { name: string }) => {
  const { error } = await authClient.updateUser({
    name: input.name
  });

  if (error) throw error;

  return input.name;
});
const ProfileSection: Component<ProfileSectionProps> = (props) => {
  const notify = useNotify();
  const { currentWorkspace, sessions } = useWorkspace();
  const updateProfileName = useAction(updateProfileNameAction);
  const updateProfileNameSubmission = useSubmission(updateProfileNameAction);

  const [localName, setLocalName] = createSignal("");
  const [saveState, setSaveState] = createSignal<"idle" | "saved">("idle");
  let savedIndicatorTimeout: ReturnType<typeof setTimeout> | undefined;

  const currentUser = createMemo(() => {
    const workspace = currentWorkspace();

    if (!workspace) return null;

    return sessions().find((session) => session.user.id === workspace.userID)?.user || null;
  });
  const currentDisplayName = createMemo(() => {
    return currentUser()?.name?.trim() || currentUser()?.email || "";
  });
  const isDirty = createMemo(() => {
    const currentName = currentDisplayName();
    const trimmed = localName().trim();
    const fallbackName = currentUser()?.email || "";
    const nextName = trimmed || fallbackName;

    return Boolean(currentUser()) && nextName !== currentName;
  });
  const isProfileSaving = createMemo(() => updateProfileNameSubmission.pending);
  const saveIndicatorState = createMemo(() => {
    if (isProfileSaving()) return "saving" as const;
    if (saveState() === "saved" && !isDirty()) return "saved" as const;
    if (isDirty()) return "unsaved" as const;

    return "idle" as const;
  });

  createEffect(() => {
    setLocalName(currentDisplayName());
    setSaveState("idle");
  });

  createEffect(() => {
    localName();

    if (saveState() === "saved" && isDirty()) {
      setSaveState("idle");
    }
  });

  createEffect(() => {
    if (savedIndicatorTimeout) {
      clearTimeout(savedIndicatorTimeout);
      savedIndicatorTimeout = undefined;
    }

    if (saveState() !== "saved" || isDirty()) return;

    savedIndicatorTimeout = setTimeout(() => {
      setSaveState("idle");
    }, 1500);
  });

  createEffect(
    on(
      () => props.opened,
      (opened, previous) => {
        if (previous && opened === false) {
          saveProfileName();
        }
      }
    )
  );

  const saveProfileName = async () => {
    const trimmed = localName().trim();
    const fallbackName = currentUser()?.email || "";
    const nextName = trimmed || fallbackName;

    if (!currentUser() || nextName === currentDisplayName() || isProfileSaving()) return;

    try {
      await updateProfileName({ name: nextName });

      await revalidate("sessions");
      setLocalName(nextName);
      setSaveState("saved");
      notify({ text: "Profile saved", type: "success" });
    } catch (error) {
      setLocalName(currentDisplayName());
      setSaveState("idle");
      notify({ text: "Failed to save profile", type: "error" });
    }
  };

  onCleanup(() => {
    if (savedIndicatorTimeout) {
      clearTimeout(savedIndicatorTimeout);
    }
  });

  return (
    <SettingsSection label="Profile">
      <Setting label="Full name" description="Your full name">
        <div class="flex w-full max-w-md flex-col gap-2">
          <div class="relative">
            <Input
              placeholder="Your name"
              class="w-full pr-28"
              size="small"
              color="contrast"
              variant="outlined"
              value={localName()}
              setValue={setLocalName}
              onBlur={saveProfileName}
              onEnter={() => {
                saveProfileName();
              }}
            />
          </div>
        </div>
      </Setting>
    </SettingsSection>
  );
};

export { ProfileSection };
