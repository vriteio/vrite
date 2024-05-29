import { mdiUpload } from "@mdi/js";
import clsx from "clsx";
import { nanoid } from "nanoid";
import { Accessor, Component, Setter, Show, createEffect, createSignal, on } from "solid-js";
import { useClient } from "#context";
import { Button, Loader, Icon } from "#components/primitives";
import { uploadFile as uploadFileUtil } from "#lib/utils";

interface SettingsImageUploadProps {
  url: string;
  disabled?: boolean;
  label?: string;
  onUpload?(url: string): void;
}

const useFileUpload = (
  initialUrl = "",
  onUpload?: (url: string) => void
): {
  url: Accessor<string>;
  uploading: Accessor<boolean>;
  setUrl: Setter<string>;
  uploadFile(file?: File | null): Promise<void>;
} => {
  const [url, setUrl] = createSignal(initialUrl);
  const [uploading, setUploading] = createSignal(false);
  const uploadFile = async (file?: File | null): Promise<void> => {
    if (file && file.type.includes("image")) {
      setUploading(true);

      const uploadedUrl = await uploadFileUtil(file);

      if (uploadedUrl) {
        setUrl(uploadedUrl);
        onUpload?.(url());
      }

      setUploading(false);
    }
  };

  return { url, uploadFile, uploading, setUrl };
};
const SettingsImageUpload: Component<SettingsImageUploadProps> = (props) => {
  const { uploadFile, uploading, url, setUrl } = useFileUpload("", props.onUpload);
  const inputId = nanoid();

  createEffect(on(() => props.url, setUrl));

  return (
    <>
      <input
        type="file"
        hidden
        id={inputId}
        name={inputId}
        accept=".jpg,.jpeg,.png,.gif,.tiff,.tif,.bmp,.webp"
        disabled={uploading() || props.disabled}
        onChange={(event) => {
          uploadFile(event.currentTarget.files?.item(0));
          event.currentTarget.value = "";
        }}
      />
      <label for={inputId} class="flex items-center justify-center cursor-pointer">
        <Button
          class="h-20 w-20 m-0 flex flex-col justify-center items-center rounded-full relative overflow-hidden"
          text="soft"
          badge
        >
          <Show when={url()}>
            <img class="w-full h-full absolute top-0 left-0" src={url()} />
          </Show>
          <div
            class={clsx(
              "z-1 h-full w-full flex-col absolute top-0 left-0 flex justify-center items-center",
              url() &&
                "transition-opacity duratio-350 ease-out opacity-0 hover:opacity-100 bg-gray-300 dark:bg-gray-700"
            )}
          >
            <Show when={!uploading()} fallback={<Loader class="w-6 h-6" />}>
              <Icon path={mdiUpload} class="h-6 w-6" />
              <span class="text-xs text-center">{props.label}</span>
            </Show>
          </div>
        </Button>
      </label>
    </>
  );
};

export { SettingsImageUpload };
