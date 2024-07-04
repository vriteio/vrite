import { ContentPieceTitle } from "./title";
import { CustomDataSection, DetailsSection, ExtensionsSection } from "./sections";
import { ContentPieceDescription } from "./description";
import { Component, createEffect, createMemo, createSignal, on, Show } from "solid-js";
import {
  mdiDotsVertical,
  mdiTrashCan,
  mdiPencil,
  mdiLock,
  mdiEye,
  mdiClose,
  mdiInformationOutline,
  mdiCodeJson
} from "@mdi/js";
import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat";
import { useLocation, useNavigate } from "@solidjs/router";
import { Image } from "#lib/editor";
import { Card, IconButton, Dropdown, Loader } from "#components/primitives";
import {
  useConfirmationModal,
  App,
  useClient,
  useLocalStorage,
  hasPermission,
  useHostConfig,
  useContentData,
  useNotifications
} from "#context";
import { MiniEditor, CollapsibleSection, ScrollShadow } from "#components/fragments";
import { breakpoints, createRef } from "#lib/utils";

dayjs.extend(CustomParseFormat);

const ContentPieceView: Component = () => {
  const hostConfig = useHostConfig();
  const { notify } = useNotifications();
  const { activeContentPieceId, activeVariantId, contentPieces, contentActions } = useContentData();
  const client = useClient();
  const { setStorage } = useLocalStorage();
  const { confirmDelete } = useConfirmationModal();
  const location = useLocation();
  const navigate = useNavigate();
  const [scrollableContainerRef, setScrollableContainerRef] = createRef<HTMLElement | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [dropdownMenuOpened, setDropdownMenuOpened] = createSignal(false);
  const [coverInitialValue, setCoverInitialValue] = createSignal("");
  const [titleInitialValue, setTitleInitialValue] = createSignal("");
  const editable = createMemo(() => {
    return hasPermission("editMetadata");
  });
  const activeContentPiece = (): App.ExtendedContentPieceWithAdditionalData<
    "order" | "coverWidth"
  > | null => {
    return activeContentPieceId() ? contentPieces[activeContentPieceId()!] || null : null;
  };
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
      variant: activeVariantId() || undefined,
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
  createEffect(() => {
    if (!activeContentPieceId.loading && !activeContentPiece()) {
      setStorage((storage) => ({
        ...storage,
        sidePanelView: ""
      }));
    }
  });

  return (
    <Show
      when={!activeContentPieceId.loading && activeContentPiece()}
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
        <div class="absolute flex top-[calc(env(safe-area-inset-top)+0.75rem)] right-3 gap-2 left-3 justify-center items-center z-10">
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
          <Show when={!location.pathname.includes("editor")}>
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
                navigate(`/editor/${activeContentPieceId() || ""}`);
              }}
            />
          </Show>
          <Show when={editable()} fallback={<IconButton path={mdiLock} badge text="soft" />}>
            <Dropdown
              placement="bottom-end"
              opened={dropdownMenuOpened()}
              setOpened={setDropdownMenuOpened}
              activatorButton={() => (
                <IconButton path={mdiDotsVertical} class="m-0" text="soft" loading={loading()} />
              )}
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

                      try {
                        setLoading(true);
                        await client.contentPieces.delete.mutate({ id });
                        contentActions.deleteContentPiece({ id });
                        setLoading(false);
                        notify({ text: "Content piece deleted", type: "success" });
                      } catch (error) {
                        notify({ text: "Couldn't delete the content piece", type: "error" });
                        setLoading(false);
                      }
                    }
                  });
                }}
              />
            </Dropdown>
          </Show>
        </div>
        <div class="flex-col h-full relative flex overflow-hidden">
          <ScrollShadow scrollableContainerRef={scrollableContainerRef} color="contrast" />
          <div
            class="w-full h-full overflow-x-hidden overflow-y-auto scrollbar-sm-contrast pt-5 px-5"
            ref={setScrollableContainerRef}
          >
            <div class="flex justify-start flex-col min-h-full h-full items-start w-full relative">
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
              <div class="min-h-2" />
              <ContentPieceTitle
                initialTitle={titleInitialValue()}
                editable={editable()}
                setTitle={(title) => {
                  handleChange({ title });
                }}
              />
              <ContentPieceDescription
                initialDescription={activeContentPiece()!.description || ""}
                editable={editable()}
                setDescription={(description) => {
                  handleChange({ description });
                }}
              />
              <div class="flex flex-col gap-0 pt-2 w-full">
                <CollapsibleSection icon={mdiInformationOutline} label="Details">
                  <div class="flex flex-col items-start w-full">
                    <DetailsSection
                      filename={activeContentPiece()!.filename || ""}
                      slug={activeContentPiece()!.slug}
                      canonicalLink={activeContentPiece()!.canonicalLink}
                      date={activeContentPiece()!.date}
                      tags={activeContentPiece()!.tags}
                      members={activeContentPiece()!.members}
                      editable={editable()}
                      setFilename={(filename) => {
                        handleChange({ filename });
                      }}
                      setSlug={(slug) => {
                        handleChange({ slug });
                      }}
                      setCanonicalLink={(canonicalLink) => {
                        handleChange({ canonicalLink });
                      }}
                      setDate={(date) => {
                        handleChange({ date });
                      }}
                      setTags={(tags) => {
                        handleChange({ tags });
                      }}
                      setMembers={(members) => {
                        handleChange({ members });
                      }}
                    />
                  </div>
                </CollapsibleSection>
                <CollapsibleSection icon={mdiCodeJson} label="Custom data" defaultOpened={false}>
                  <div class="w-full">
                    <CustomDataSection
                      editable={editable()}
                      customData={activeContentPiece()!.customData}
                      setCustomData={(customData) => {
                        handleChange({ customData });
                      }}
                    />
                  </div>
                </CollapsibleSection>
                <Show when={hostConfig.extensions}>
                  <ExtensionsSection
                    contentPiece={activeContentPiece()!}
                    setCustomData={(customData) => {
                      handleChange({
                        customData
                      });
                    }}
                  />
                </Show>
                <div class="min-h-32" />
              </div>
            </div>
          </div>
        </div>
      </Card>
    </Show>
  );
};

export { ContentPieceView };
