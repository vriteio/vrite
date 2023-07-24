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
  useCache
} from "#context";
import { MiniEditor } from "#components/fragments";
import { breakpoints } from "#lib/utils";
import { useOpenedContentPiece } from "#lib/composables";

dayjs.extend(CustomParseFormat);

const ContentPieceView: Component = () => {
  const sections = [
    { label: "Details", id: "details", icon: mdiInformationOutline },
    { label: "Custom data", id: "custom-data", icon: mdiCodeJson },
    { label: "Extensions", id: "extensions", icon: mdiPuzzleOutline },
    { label: "Variants", id: "variants", icon: mdiCardsOutline }
  ];
  const cache = useCache();
  const { contentPiece, setContentPiece, loading, activeVariant, setActiveVariant } = cache(
    "openedContentPiece",
    useOpenedContentPiece
  );
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
    return !contentPiece()?.locked && hasPermission("editMetadata");
  });
  const handleChange = async (
    value: Partial<App.ExtendedContentPieceWithAdditionalData<"coverWidth">>
  ): Promise<void> => {
    const id = contentPiece()?.id;

    if (!id) return;

    setContentPiece(value);

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
  };

  createEffect(
    on([loading, contentPiece], ([loading, contentPiece]) => {
      if (!loading && !contentPiece) {
        setStorage((storage) => ({
          ...storage,
          sidePanelView: undefined,
          contentPieceId: undefined
        }));
      }
    })
  );
  createEffect(
    on(
      () => contentPiece()?.title,
      (title) => {
        setTitleInitialValue(title || "");
      }
    )
  );
  createEffect(
    on(
      () => contentPiece()?.description,
      (description) => {
        setDescriptionInitialValue(description || "");
      }
    )
  );
  createEffect(
    on(
      [
        () => contentPiece()?.coverUrl,
        () => contentPiece()?.coverAlt,
        () => contentPiece()?.coverWidth
      ],
      ([url, alt, width]) => {
        setCoverInitialValue(`<img src="${url || ""}" alt="${alt || ""}" width="${width || ""}"/>`);
      }
    )
  );

  return (
    <Show
      when={!loading() && contentPiece()}
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
                      const id = contentPiece()?.id;

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
          <div class="flex justify-start items-center mb-1">
            <Tooltip text="Active Variant" side="right" class="ml-1">
              <IconButton
                class="m-0"
                size="small"
                path={mdiCards}
                color={activeVariant() ? "primary" : "base"}
                text={activeVariant() ? "primary" : "soft"}
                label={activeVariant() ? activeVariant()?.label : "Base"}
                onClick={() => {
                  setActiveSection(sections[3]);
                }}
              />
            </Tooltip>
          </div>
          <ContentPieceTitle
            initialTitle={titleInitialValue()}
            editable={editable()}
            setTitle={(title) => {
              handleChange({ title });
            }}
          />
          <ContentPieceMetadata
            activeVariant={activeVariant()}
            setActiveVariant={setActiveVariant}
            contentPiece={contentPiece()!}
            setContentPiece={handleChange}
            editable={editable()}
            sections={sections}
            activeSection={activeSection()}
            setActiveSection={setActiveSection}
          />
          <ContentPieceDescription
            descriptionExists={typeof contentPiece()?.description === "string"}
            initialDescription={descriptionInitialValue()}
            editable={editable()}
            setDescription={(description) => {
              handleChange({ description });
            }}
          />
        </div>
      </Card>
    </Show>
  );
};

export { ContentPieceView };
