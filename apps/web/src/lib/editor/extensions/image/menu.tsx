import { ImageAttributes, ImageOptions } from "./node";
import { SolidNodeViewProps } from "@vrite/tiptap-solid";
import { mdiImageText, mdiLinkVariant, mdiText, mdiUpload } from "@mdi/js";
import { Component, Show, createSignal } from "solid-js";
import { nanoid } from "nanoid";
import { debounce } from "@solid-primitives/scheduled";
import clsx from "clsx";
import { createRef, uploadFile as uploadFileUtil } from "#lib/utils";
import { Card, IconButton, Input, Tooltip } from "#components/primitives";

interface ImageMenuProps {
  state: SolidNodeViewProps<ImageAttributes>;
}

const ImageMenu: Component<ImageMenuProps> = (props) => {
  const { storage } = props.state.extension;
  const [inputMode, setInputMode] = createSignal<"alt" | "src" | "caption">("src");
  const [uploading, setUploading] = createSignal(false);
  const [inputValue, setInputValue] = createRef("");
  const attrs = (): ImageAttributes => props.state.node.attrs;
  const options = (): ImageOptions => props.state.extension.options;
  const placeholder = (): string => {
    if (inputMode() === "caption") return "Caption";

    if (inputMode() === "src") {
      return options().cover ? "Cover image URL" : "Image URL";
    }

    return options().cover ? "Cover alt description" : "Alt description";
  };
  const updateAttribute = debounce((attribute: "src" | "alt" | "caption", value: string) => {
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
        "pointer-events-auto flex bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 border-y backdrop-blur-sm relative !md:left-unset",
        options().cover ? "w-full border rounded-xl overflow-hidden" : "w-screen",
        "md:gap-2 md:flex-1 md:border-0 md:rounded-2xl md:overflow-visible !md:bg-transparent"
      )}
    >
      <Card
        class={clsx(
          "p-1 flex m-0 border-0 overflow-hidden rounded-none gap-1",
          "md:gap-0.5 md:p-0 md:border md:rounded-xl"
        )}
      >
        <Tooltip text="Alt" fixed class="mt-1">
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
        <Show when={!options().cover}>
          <Tooltip text="Caption" fixed class="mt-1">
            <IconButton
              path={mdiImageText}
              color={inputMode() === "caption" ? "primary" : "contrast"}
              text={inputMode() === "caption" ? "primary" : "soft"}
              variant={inputMode() === "caption" ? "solid" : "text"}
              class="m-0"
              onClick={() => {
                setInputMode("caption");
              }}
            ></IconButton>
          </Tooltip>
        </Show>
      </Card>
      <Card
        class={clsx(
          "px-1 py-1 m-0 border-0 flex-1 overflow-hidden rounded-none",
          "md:py-0 md:border md:rounded-xl"
        )}
      >
        <Input
          wrapperClass={clsx("w-full min-w-unset flex-1", "md:max-w-96")}
          class="w-full bg-transparent m-0 flex-1 text-lg"
          placeholder={placeholder()}
          value={attrs()[inputMode()] || ""}
          disabled={!props.state.editor.isEditable}
          setValue={(value) => {
            setInputValue(value);

            if (!options().cover) {
              updateAttribute.clear();
              updateAttribute(inputMode(), value);
            }
          }}
          onFocus={() => {
            setInputValue(attrs()[inputMode()] || "");
          }}
          onBlur={() => {
            props.state.updateAttributes({ [inputMode()]: inputValue() || "" });
            setInputValue("");
          }}
        />
      </Card>
      <Card
        class={clsx(
          "p-1 flex m-0 border-0 overflow-hidden rounded-none gap-1",
          "md:gap-0.5 md:p-0 md:border md:rounded-xl"
        )}
      >
        <Tooltip text="Image URL" fixed class="mt-1">
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
        </Tooltip>{" "}
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
          <Tooltip text={uploading() ? "Uploading" : "Upload image"} class="mt-1" fixed>
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
