import { ContentPieceTitle } from "./title";
import { ContentPieceDescription } from "./description";
import { ContentPieceMetadata } from "./metadata";
import { Component, createEffect, createMemo, createSignal, on, Show } from "solid-js";
import {
  mdiDotsVertical,
  mdiTrashCan,
  mdiPencil,
  mdiLock,
  mdiEye,
  mdiClose,
  mdiCardsOutline,
  mdiCards,
  mdiInformationOutline,
  mdiCodeJson,
  mdiPuzzleOutline
} from "@mdi/js";
import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat";
import { useLocation, useNavigate } from "@solidjs/router";
import { Image } from "#lib/editor";
import { Card, IconButton, Dropdown, Loader, Tooltip } from "#components/primitives";
import {
  useConfirmationModal,
  App,
  useClient,
  useLocalStorage,
  hasPermission,
  useHostConfig,
  useSharedState,
  useContentData
} from "#context";
import { MiniEditor } from "#components/fragments";
import { breakpoints } from "#lib/utils";

dayjs.extend(CustomParseFormat);

const ContentPieceView: Component = () => {
  const hostConfig = useHostConfig();
  const sections = [
    { label: "Details", id: "details", icon: mdiInformationOutline },
    { label: "Custom data", id: "custom-data", icon: mdiCodeJson },
    hostConfig.extensions && { label: "Extensions", id: "extensions", icon: mdiPuzzleOutline }
  ].filter(Boolean) as Array<{
    label: string;
    id: string;
    icon: string;
  }>;
  const { useSharedSignal } = useSharedState();
  const { activeContentPieceId, contentPieces, contentActions } = useContentData();
  const client = useClient();
  const { setStorage } = useLocalStorage();
  const { confirmDelete } = useConfirmationModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownMenuOpened, setDropdownMenuOpened] = createSignal(false);
  const [coverInitialValue, setCoverInitialValue] = createSignal("");
  const [titleInitialValue, setTitleInitialValue] = createSignal("");
  const [descriptionInitialValue, setDescriptionInitialValue] = createSignal("");
  const [activeSection, setActiveSection] = createSignal(sections[0]);
  const editable = createMemo(() => {
    return hasPermission("editMetadata");
  });
  const activeContentPiece = (): App.ExtendedContentPieceWithAdditionalData<
    "order" | "coverWidth"
  > | null => {
    return activeContentPieceId() ? contentPieces[activeContentPieceId()!] || null : null;
  };
  const activeVariant = (): null => null;
  const handleChange = async (
    value: Partial<App.ExtendedContentPieceWithAdditionalData<"coverWidth">>
  ): Promise<void> => {
    const id = activeContentPiece()?.id;

    if (!id) return;

    const { tags, members, ...update } = value;
    const contentPieceUpdate: Partial<App.ExtendedContentPiece<"coverWidth">> = {
      ...update
    };

    if (tags) {
      contentPieceUpdate.tags = tags?.map(({ id }) => id);
    }

    if (members) {
      contentPieceUpdate.members = members?.map(({ id }) => id);
    }

    client.contentPieces.update.mutate({
      id,
      variant: activeVariant()?.id,
      ...contentPieceUpdate
    });
    contentActions.updateContentPiece({
      id,
      ...update,
      ...(tags ? { tags } : {}),
      ...(members ? { members } : {})
    });
  };

  createEffect(
    on(
      () => activeContentPiece()?.title,
      (title) => {
        setTitleInitialValue(title || "");
      }
    )
  );
  createEffect(
    on(
      () => activeContentPiece()?.description,
      (description) => {
        setDescriptionInitialValue(description || "");
      }
    )
  );
  createEffect(
    on(
      [
        () => activeContentPiece()?.coverUrl,
        () => activeContentPiece()?.coverAlt,
        () => activeContentPiece()?.coverWidth
      ],
      ([url, alt, width]) => {
        setCoverInitialValue(`<img src="${url || ""}" alt="${alt || ""}" width="${width || ""}"/>`);
      }
    )
  );

  return (
    <Show
      when={activeContentPiece()}
      fallback={
        <div class="flex h-full w-full justify-center items-center">
          <Loader />
        </div>
      }
    >
      <Card
        class="flex flex-col m-0 relative p-0 border-0 rounded-none h-full w-full md:overflow-visible overflow-y-auto scrollbar-sm-contrast pt-[env(safe-area-inset-top)]"
        color="contrast"
      >
        <MiniEditor
          initialValue={coverInitialValue()}
          onChange={(editor) => {
            const attrs = editor.getJSON().content?.[0].attrs || {};

            handleChange({
              coverAlt: attrs.alt || "",
              coverUrl: attrs.src || "",
              coverWidth: attrs.width || ""
            });
          }}
          content="image"
          readOnly={!editable()}
          extensions={[Image.configure({ cover: true })]}
        />
        <div class="absolute flex top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 gap-2 left-3 justify-center items-center">
          <IconButton
            path={mdiClose}
            text="soft"
            class="m-0 md:hidden"
            onClick={async () => {
              setStorage((storage) => ({
                ...storage,
                sidePanelWidth: 0
              }));
            }}
          />
          <div class="flex-1" />
          <Show when={location.pathname !== "/editor"}>
            <IconButton
              path={editable() ? mdiPencil : mdiEye}
              label={editable() ? "Open in editor" : "Preview content"}
              text="soft"
              class="m-0"
              onClick={async () => {
                if (!breakpoints.md()) {
                  setStorage((storage) => ({
                    ...storage,
                    sidePanelWidth: 0
                  }));
                }

                setDropdownMenuOpened(false);
                navigate("/editor");
              }}
            />
          </Show>
          <Show when={editable()} fallback={<IconButton path={mdiLock} badge text="soft" />}>
            <Dropdown
              placement="bottom-end"
              opened={dropdownMenuOpened()}
              setOpened={setDropdownMenuOpened}
              activatorButton={() => <IconButton path={mdiDotsVertical} class="m-0" text="soft" />}
            >
              <IconButton
                path={mdiTrashCan}
                label="Delete"
                variant="text"
                color="danger"
                class="justify-start w-full m-0"
                onClick={async () => {
                  setDropdownMenuOpened(false);
                  confirmDelete({
                    header: "Delete piece",
                    content: (
                      <p>
                        Do you really want to delete this content piece? This will delete all its
                        content and metadata.
                      </p>
                    ),
                    async onConfirm() {
                      const id = activeContentPiece()?.id;

                      if (!id) return;

                      await client.contentPieces.delete.mutate({ id });
                      setStorage((storage) => ({ ...storage, contentPieceId: undefined }));
                    }
                  });
                }}
              />
            </Dropdown>
          </Show>
        </div>
        <div class="flex-1 border-gray-200 dark:border-gray-700 transition-all p-3 overflow-initial md:overflow-y-auto scrollbar-sm-contrast">
          <ContentPieceTitle
            initialTitle={titleInitialValue()}
            editable={editable()}
            setTitle={(title) => {
              handleChange({ title });
            }}
          />
          <ContentPieceMetadata
            activeVariant={activeVariant()}
            setActiveVariant={() => {
              /* setActiveVariant*/
            }}
            contentPiece={activeContentPiece()!}
            setContentPiece={handleChange}
            editable={editable()}
            sections={sections}
            activeSection={activeSection()}
            setActiveSection={setActiveSection}
          />
        </div>
      </Card>
    </Show>
  );
};

export { ContentPieceView };
