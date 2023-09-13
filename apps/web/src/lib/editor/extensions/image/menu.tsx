import { ImageAttributes, ImageOptions } from "./node";
import { SolidNodeViewProps } from "@vrite/tiptap-solid";
import { mdiLinkVariant, mdiText, mdiUpload } from "@mdi/js";
import { Component, createSignal, Show } from "solid-js";
import { nanoid } from "nanoid";
import { debounce } from "@solid-primitives/scheduled";
import { uploadFile as uploadFileUtil } from "#lib/utils";
import { Button, IconButton, Input, Loader, Tooltip } from "#components/primitives";

interface ImageMenuProps {
  state: SolidNodeViewProps<ImageAttributes>;
}

const ImageMenu: Component<ImageMenuProps> = (props) => {
  const { storage } = props.state.extension;
  const [inputMode, setInputMode] = createSignal<"alt" | "src">("src");
  const [uploading, setUploading] = createSignal(false);
  const attrs = (): ImageAttributes => props.state.node.attrs;
  const options = (): ImageOptions => props.state.extension.options;
  const updateAttribute = debounce((attribute: "src" | "alt", value: string) => {
    return props.state.updateAttributes({ [attribute]: value });
  }, 200);
  const inputId = nanoid();
  const uploadFile = async (file?: File | null): Promise<void> => {
    if (file && file.type.includes("image")) {
      setUploading(true);

      const uploadedUrl = await uploadFileUtil(file);

      if (uploadedUrl) {
        props.state.updateAttributes({ src: uploadedUrl });
      }

      setUploading(false);
    }
  };
  const getPlaceholder = (): string => {
    if (inputMode() === "src") {
      return options().cover ? "Cover image URL" : "Image URL";
    }

    return options().cover ? "Cover alt description" : "Alt description";
  };

  if (storage.droppedFile()) {
    uploadFile(storage.droppedFile());
    storage.setDroppedFile(null);
  }

  return (
    <div class="flex p-0 transition-shadow duration-200 border-0 rounded-xl">
      <Tooltip text="Alt">
        <IconButton
          path={mdiText}
          color={inputMode() === "alt" ? "primary" : "contrast"}
          text={inputMode() === "alt" ? "primary" : "soft"}
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
          onClick={() => {
            setInputMode("src");
          }}
        ></IconButton>
      </Tooltip>
      <Input
        color="contrast"
        wrapperClass="flex-1 max-w-full min-w-unset"
        class="w-full"
        placeholder={getPlaceholder()}
        value={attrs()[inputMode()] || ""}
        disabled={!props.state.editor.isEditable}
        setValue={(value) => {
          updateAttribute.clear();
          updateAttribute(inputMode(), value);
        }}
      />
      <Show when={props.state.editor.isEditable}>
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
          <Tooltip text={uploading() ? "Uploading" : "Upload image"}>
            <Show
              when={!uploading()}
              fallback={
                <Button badge color="contrast" class="flex items-center justify-center w-8 h-8">
                  <Loader class="w-6 h-6" />
                </Button>
              }
            >
              <IconButton path={mdiUpload} color="contrast" text="soft" badge></IconButton>
            </Show>
          </Tooltip>
        </label>
      </Show>
    </div>
  );
};

export { ImageMenu };
