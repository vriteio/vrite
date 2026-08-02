import { useClipboard } from "#web/context/clipboard";
import { Overlay, Card, Button, IconButton } from "@andesine/components";
import { Component, createEffect, createSignal } from "solid-js";

interface NewKeyDialogProps {
  key: string;
  onClose(): void;
}

const NewKeyDialog: Component<NewKeyDialogProps> = (props) => {
  const { copyText } = useClipboard();
  const [visibleKey, setVisibleKey] = createSignal(props.key);
  const [copied, setCopied] = createSignal(false);
  const handleClose = () => {
    props.onClose();
    setTimeout(() => setVisibleKey(""), 300);
  };
  const copyKey = async () => {
    const rawKey = visibleKey();

    if (!rawKey || copied()) return;

    const success = await copyText(rawKey, {
      success: "Key copied to clipboard",
      fallback: { title: "Copy API key manually" }
    });

    if (!success) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  createEffect(() => {
    if (props.key) {
      setVisibleKey(props.key);
    }
  });

  return (
    <Overlay opened={Boolean(props.key)} onOverlayClick={handleClose}>
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-lg flex-col gap-3 p-4 rounded-xl" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">Your API key</h3>
            <p class="text-sm text-gray-400 dark:text-gray-500 leading-tight">
              Copy this key now. You won't be able to see it again
            </p>
          </div>
          <Card
            class="flex justify-center items-center select-all h-16 rounded-xl p-3 font-mono text-sm border-0"
            color="contrast"
          >
            {visibleKey()}
          </Card>
          <div class="flex gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:x"
              onClick={handleClose}
            />
            <Button
              color="primary"
              variant="outlined"
              size="small"
              onClick={copyKey}
              disabled={copied()}
              class="flex-1"
            >
              {copied() ? "Copied!" : "Copy Key"}
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { NewKeyDialog };
