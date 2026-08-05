import { Button, Card, IconButton, Overlay, ToggleGroup } from "@andesine/components";
import { type Component, createEffect, createSignal, type JSX } from "solid-js";

type ExpirationOption = "now" | "1h" | "24h" | "7d";

interface RotateKeyDialogProps {
  key: { name: string; prefix: string } | null;
  loading?: boolean;
  onClose(): void;
  onConfirm(expiresIn: ExpirationOption): void;
}

const expirationOptions: Array<{
  value: ExpirationOption;
  label: string;
  description: JSX.Element;
}> = [
  {
    value: "now",
    label: "Now",
    description: (
      <span>
        The current key will stop working{" "}
        <span class="font-medium text-gray-700 dark:text-white">immediately</span>.
      </span>
    )
  },
  {
    value: "1h",
    label: "1 hour",
    description: (
      <span>
        The current key will keep working for{" "}
        <span class="font-medium text-gray-700 dark:text-white">1 hour</span>.
      </span>
    )
  },
  {
    value: "24h",
    label: "24 hours",
    description: (
      <span>
        The current key will keep working for{" "}
        <span class="font-medium text-gray-700 dark:text-white">24 hours</span>.
      </span>
    )
  },
  {
    value: "7d",
    label: "7 days",
    description: (
      <span>
        The current key will keep working for{" "}
        <span class="font-medium text-gray-700 dark:text-white">7 days</span>.
      </span>
    )
  }
];

const RotateKeyDialog: Component<RotateKeyDialogProps> = (props) => {
  const [expiresIn, setExpiresIn] = createSignal<ExpirationOption>("24h");
  const [visibleKey, setVisibleKey] = createSignal(props.key);
  const handleClose = () => {
    if (props.loading) return;

    props.onClose();
    setTimeout(() => {
      setVisibleKey(null);
      setExpiresIn("24h");
    }, 300);
  };

  createEffect(() => {
    if (props.key) {
      setVisibleKey(props.key);
      setExpiresIn("24h");
    }
  });

  return (
    <Overlay opened={Boolean(props.key)} onOverlayClick={handleClose} aria-label="Rotate API key">
      <Card color="contrast" class="p-1.5">
        <Card class="flex w-lg max-w-[calc(100vw-2rem)] flex-col gap-3 rounded-xl p-4" shade>
          <div class="flex flex-col gap-0.5">
            <h3 class="text-lg font-semibold leading-tight">Rotate API key?</h3>
            <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
              A replacement with the same name and permissions will be created. It'll be shown only
              once.
            </p>
          </div>
          <Card
            class="flex items-center gap-1 rounded-lg border-0 px-1 py-0.5 h-8"
            color="contrast"
          >
            <div class="h-6 w-6 flex justify-center items-center">
              <div class="i-lucide:key-round h-5 w-5 text-gray-400 dark:text-gray-500" />
            </div>
            <div class="flex items-center flex-1 gap-1.5">
              <span class="font-medium line-clamp-1">{visibleKey()?.name}</span>
              <div class="w-px h-4 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
              <span class="text-xs shrink-0 font-mono text-gray-400 dark:text-gray-500">
                {visibleKey()?.prefix}...
              </span>
            </div>
          </Card>
          <p class="text-sm leading-tight text-gray-400 dark:text-gray-500">
            {expirationOptions.find(({ value }) => value === expiresIn())?.description}
          </p>
          <ToggleGroup
            value={expiresIn()}
            setValue={(value) => {
              if (value) setExpiresIn(value as ExpirationOption);
            }}
            options={expirationOptions.map(({ value, label }) => ({ value, label }))}
            disabled={props.loading}
            wrapperClass="w-full"
            itemClass="flex-1"
          />
          <div class="flex gap-2">
            <IconButton
              variant="outlined"
              color="contrast"
              text="soft"
              size="small"
              icon="i-lucide:x"
              disabled={props.loading}
              onClick={handleClose}
            />
            <Button
              color="primary"
              variant="outlined"
              size="small"
              loading={props.loading}
              onClick={() => props.onConfirm(expiresIn())}
              class="flex-1"
            >
              Rotate key
            </Button>
          </div>
        </Card>
      </Card>
    </Overlay>
  );
};

export { RotateKeyDialog };
export type { ExpirationOption };
