import { Button, Card, Overlay } from "@andesine/components";
import { Component, createSignal, Show } from "solid-js";
import { SettingsTab, SettingsTabProps } from "../../settings-tab";
import { KeyFormPage } from "./key-form";
import { refreshAPIKeys } from "./credentials-section";

const CreateKeyTab: Component<SettingsTabProps> = (props) => {
  const [revealedKey, setRevealedKey] = createSignal<string | null>(null);
  const [copied, setCopied] = createSignal(false);

  const copyKey = async () => {
    const rawKey = revealedKey();

    if (!rawKey) return;

    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SettingsTab {...props}>
      <Show when={revealedKey()}>
        <Overlay
          opened={Boolean(revealedKey())}
          aria-label="API key"
          onOverlayClick={() => setRevealedKey(null)}
        >
          <Card class="flex w-lg flex-col gap-3 rounded-2xl p-4" color="contrast">
            <div class="flex flex-col gap-1">
              <h3 class="text-lg font-semibold">Your API Key</h3>
              <p class="text-sm text-gray-400 dark:text-gray-500">
                Copy this key now. You won't be able to see it again.
              </p>
            </div>
            <Card class="select-all break-all rounded-xl p-3 font-mono text-sm" shade>
              {revealedKey()}
            </Card>
            <div class="flex justify-end gap-2">
              <Button
                variant="outlined"
                text="soft"
                size="small"
                onClick={() => props.setTab("api")}
              >
                Close
              </Button>
              <Button color="primary" variant="solid" size="small" onClick={copyKey}>
                {copied() ? "Copied!" : "Copy key"}
              </Button>
            </div>
          </Card>
        </Overlay>
      </Show>
      <KeyFormPage
        mode="create"
        goBack={() => props.setTab("api")}
        goBackOnSuccess={false}
        onCreated={async (rawKey) => {
          setRevealedKey(rawKey);
          await refreshAPIKeys();
        }}
      />
    </SettingsTab>
  );
};

export { CreateKeyTab };
