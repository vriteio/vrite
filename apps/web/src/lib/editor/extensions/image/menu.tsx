import { ImageAttributes, ImageOptions } from "./node";
import { SolidNodeViewProps } from "@vrite/tiptap-solid";
import { mdiLinkVariant, mdiText, mdiUpload } from "@mdi/js";
import { Component, createSignal } from "solid-js";
import { nanoid } from "nanoid";
import { debounce } from "@solid-primitives/scheduled";
import clsx from "clsx";
import { uploadFile as uploadFileUtil } from "#lib/utils";
import { Card, IconButton, Input, Tooltip } from "#components/primitives";

interface ImageMenuProps {
  state: SolidNodeViewProps<ImageAttributes>;
}

const ImageMenu: Component<ImageMenuProps> = (props) => {
  const { storage } = props.state.extension;
  const [inputMode, setInputMode] = createSignal<"alt" | "src">("src");
  const [uploading, setUploading] = createSignal(false);
  const attrs = (): ImageAttributes => props.state.node.attrs;
  const options = (): ImageOptions => props.state.extension.options;
  const placeholder = (): string => {
    if (inputMode() === "src") {
      return options().cover ? "Cover image URL" : "Image URL";
    }

    return options().cover ? "Cover alt description" : "Alt description";
  };
  const updateAttribute = debounce((attribute: "src" | "alt", value: string) => {
    return props.state.updateAttributes({ [attribute]: value });
  }, 200);
  const uploadFile = async (file?: File | null): Promise<void> => {
    if (file && file.type.includes("image")) {
      setUploading(true);

      const uploadedUrl = await uploadFileUtil(file);

      if (uploadedUrl) props.state.updateAttributes({ src: uploadedUrl });

      setUploading(false);
    }
  };
  const inputId = nanoid();

  if (storage.droppedFile()) {
    uploadFile(storage.droppedFile());
    storage.setDroppedFile(null);
  }

  return (
    <div
      class={clsx(
        "pointer-events-auto flex bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 border-y-2 backdrop-blur-sm relative",
        options().cover && "w-full border-t-0",
        !options().cover &&
          "md:gap-2 w-screen md:w-auto md:border-0 md:rounded-2xl !md:bg-transparent left-[5px] !md:left-unset"
      )}
    >
      <Card class={clsx("flex py-0 m-0 border-0  px-1 gap-1", !options().cover && "md:border-2")}>
        <Tooltip text="Alt">
          <IconButton
            path={mdiText}
            color={inputMode() === "alt" ? "primary" : "contrast"}
            text={inputMode() === "alt" ? "primary" : "soft"}
            variant={inputMode() === "alt" ? "solid" : "text"}
            class="m-0"
            onClick={() => {
              setInputMode("alt");
            }}
          ></IconButton>
        </Tooltip>
        <Tooltip text="Image URL">
          <IconButton
            path={mdiLinkVariant}
            color={inputMode() === "src" ? "primary" : "contrast"}
            text={inputMode() === "src" ? "primary" : "soft"}
            variant={inputMode() === "src" ? "solid" : "text"}
            class="m-0"
            onClick={() => {
              setInputMode("src");
            }}
          ></IconButton>
        </Tooltip>
      </Card>
      <Card class={clsx("p-1 m-0 border-0 flex-1", !options().cover && "md:border-2")}>
        <Input
          wrapperClass={clsx("max-w-full min-w-unset flex-1", !options().cover && "md:w-96 ")}
          class="w-full bg-transparent m-0 flex-1 text-lg"
          placeholder={placeholder()}
          value={attrs()[inputMode()] || ""}
          disabled={!props.state.editor.isEditable}
          setValue={(value) => {
            updateAttribute.clear();
            updateAttribute(inputMode(), value);
          }}
        />
      </Card>
      <Card class={clsx("p-1 m-0 border-0", !options().cover && "md:border-2")}>
        <input
          type="file"
          hidden
          disabled={uploading()}
          id={inputId}
          name={inputId}
          accept=".jpg,.jpeg,.png,.gif,.tiff,.tif,.bmp,.webp"
          onChange={(event) => {
            uploadFile(event.currentTarget.files?.item(0));
            event.currentTarget.value = "";
          }}
        />
        <label for={inputId} class="flex items-center justify-center">
          <Tooltip text={uploading() ? "Uploading" : "Upload image"} class="mt-1">
            <IconButton
              loading={uploading()}
              path={mdiUpload}
              color="contrast"
              class="m-0"
              text="soft"
              badge
              variant="text"
            ></IconButton>
          </Tooltip>
        </label>
      </Card>
    </div>
  );
};

export { ImageMenu };
