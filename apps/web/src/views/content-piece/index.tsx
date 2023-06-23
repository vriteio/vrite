import { ContentPieceTitle } from "./title";
import { ContentPieceDescription } from "./description";
import { ContentPieceMetadata } from "./metadata";
import { Component, createEffect, createMemo, createSignal, on, onCleanup, Show } from "solid-js";
import { mdiDotsVertical, mdiTrashCan, mdiPencil, mdiLock, mdiEye } from "@mdi/js";
import dayjs from "dayjs";
import CustomParseFormat from "dayjs/plugin/customParseFormat";
import { useLocation, useNavigate } from "@solidjs/router";
import { createStore } from "solid-js/store";
import { Image } from "#lib/editor";
import { Card, IconButton, Dropdown, Loader } from "#components/primitives";
import {
  useConfirmationContext,
  App,
  useClientContext,
  useAuthenticatedContext,
  useUIContext,
  hasPermission
} from "#context";
import { MiniEditor } from "#components/fragments";

interface OpenedContentPiece {
  setContentPiece<
    K extends keyof App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">
  >(
    keyOrObject: K | Partial<App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">>,
    value?: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">[K]
  ): void;
  loading(): boolean;
  contentPiece(): App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth"> | null;
}

dayjs.extend(CustomParseFormat);

const useOpenedContentPiece = (): OpenedContentPiece => {
  const { deletedTags } = useAuthenticatedContext();
  const { profile } = useAuthenticatedContext();
  const { storage, setStorage } = useUIContext();
  const { client } = useClientContext();
  const [loading, setLoading] = createSignal(true);
  const [state, setState] = createStore<{
    contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth"> | null;
  }>({ contentPiece: null });
  const fetchContentPiece = async (): Promise<void> => {
    setLoading(true);

    const { contentPieceId } = storage();

    if (contentPieceId) {
      try {
        const contentPiece = await client.contentPieces.get.query({
          id: contentPieceId
        });

        setState({ contentPiece });
      } catch (e) {
        setState({ contentPiece: null });
      }
    } else {
      setState({ contentPiece: null });
    }

    setLoading(false);
  };

  createEffect(
    on(
      () => storage().contentPieceId,
      (contentPieceId, previousContentPieceId) => {
        if (contentPieceId !== previousContentPieceId) {
          fetchContentPiece();
        }

        return contentPieceId;
      }
    )
  );
  createEffect(
    on(
      () => state.contentPiece?.contentGroupId,
      (contentGroupId, previousContentGroupId) => {
        if (!contentGroupId || contentGroupId === previousContentGroupId) return;

        const contentPiecesChanges = client.contentPieces.changes.subscribe(
          {
            contentGroupId
          },
          {
            onData({ data, action, userId = "" }) {
              if (action === "update") {
                const { tags, members, ...updateData } = data;
                const update: Partial<
                  App.ExtendedContentPieceWithAdditionalData<"locked" | "coverWidth">
                > = { ...updateData };

                if (data.members && userId !== profile()?.id) {
                  update.members = data.members.filter((member) => member.id !== profile()?.id);
                }
                if (data.tags && userId !== profile()?.id) {
                  update.tags = data.tags.filter((tag) => !deletedTags().includes(tag.id));
                }

                setState("contentPiece", update);
              } else if (action === "delete") {
                setState("contentPiece", null);
                setStorage((storage) => ({ ...storage, contentPieceId: undefined }));
              } else if (action === "move") {
                const move = {
                  ...data.contentPiece
                };

                if (data.contentPiece.tags) {
                  move.tags = data.contentPiece.tags.filter((tag) => {
                    return !deletedTags().includes(tag.id);
                  });
                }

                setState("contentPiece", move);
              }
            }
          }
        );

        onCleanup(() => {
          contentPiecesChanges.unsubscribe();
        });

        return contentGroupId;
      }
    )
  );
  createEffect(
    on(deletedTags, (deletedTags) => {
      if (state.contentPiece) {
        setState("contentPiece", "tags", (tags) => {
          return tags.filter((tag) => !deletedTags.includes(tag.id));
        });
      }
    })
  );

  return {
    loading,
    contentPiece: () => state.contentPiece,
    setContentPiece: (keyOrObject, value) => {
      if (typeof keyOrObject === "string" && value) {
        setState("contentPiece", keyOrObject, value);
      } else if (typeof keyOrObject === "object") {
        setState("contentPiece", keyOrObject);
      }
    }
  };
};
const ContentPieceView: Component = () => {
  const { client } = useClientContext();
  const { setStorage } = useUIContext();
  const { confirmDelete } = useConfirmationContext();
  const { contentPiece, setContentPiece, loading } = useOpenedContentPiece();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownMenuOpened, setDropdownMenuOpened] = createSignal(false);
  const [coverInitialValue, setCoverInitialValue] = createSignal("");
  const [titleInitialValue, setTitleInitialValue] = createSignal("");
  const [descriptionInitialValue, setDescriptionInitialValue] = createSignal("");
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
        class="flex flex-col m-0 relative p-0 border-0 h-full w-full overflow-visible"
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
        <div class="absolute flex top-3 right-3 gap-2 justify-center items-center">
          <Show when={location.pathname !== "/editor"}>
            <IconButton
              path={editable() ? mdiPencil : mdiEye}
              label={editable() ? "Open in editor" : "Preview content"}
              text="soft"
              class="m-0"
              onClick={async () => {
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
                class="justify-start"
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
        <div class="flex-1 border-gray-200 dark:border-gray-700 transition-all rounded-b-2xl p-3 overflow-y-auto scrollbar-sm-contrast">
          <ContentPieceTitle
            initialTitle={titleInitialValue()}
            editable={editable()}
            setTitle={(title) => {
              handleChange({ title });
            }}
          />
          <ContentPieceMetadata
            contentPiece={contentPiece()!}
            setContentPiece={handleChange}
            editable={editable()}
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
