import { Button, Card, IconButton, Overlay } from "@andesine/components";
import { type Component, createEffect, createSignal } from "solid-js";

import { useClipboard } from "#web/context/clipboard";

interface NewInviteDialogProps {
  delivery: "sent" | "manual" | "failed";
  link: string;
  onClose(): void;
}

const NewInviteDialog: Component<NewInviteDialogProps> = (props) => {
  const { copyText } = useClipboard();
  const [copied, setCopied] = createSignal(false);
  const description = () => {
    if (props.delivery === "manual") {
      return "Email delivery is not configured. Share this link directly with the invitee.";
    }

    if (props.delivery === "failed") {
      return "The invitation was created, but its email could not be delivered. Share this link manually.";
    }

    return "The invitation email was sent. You can also share this link directly.";
  };
  const copyLink = async () => {
    if (!props.link || copied()) return;

    const success = await copyText(props.link, {
      success: "Invite link copied to clipboard",
      error: "Failed to copy invite link. Copy it manually instead.",
      fallback: { title: "Copy invite link manually" }
    });

    if (!success) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  createEffect(() => {
    if (props.link) setCopied(false);
  });

  return (
    <Overlay opened={Boolean(props.link)} onOverlayClick={props.onClose} aria-label="Invite link">
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-lg flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">Invitation created</h3>
            <p class="text-sm leading-tight text-gray-400">{description()}</p>
          </div>
          <Card
            class="flex min-h-16 items-center justify-center break-all rounded-xl border-0 p-3 font-mono text-sm select-all"
            color="contrast"
          >
            {props.link}
          </Card>
          <div class="flex gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:x"
              onClick={props.onClose}
            />
            <Button
              color="primary"
              variant="outlined"
              size="small"
              onClick={copyLink}
              disabled={copied()}
              class="flex-1"
            >
              {copied() ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { NewInviteDialog };
