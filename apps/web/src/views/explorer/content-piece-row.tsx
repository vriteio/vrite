import { Component, Show } from "solid-js";
import { mdiEye, mdiFileDocumentOutline, mdiFileOutline, mdiPencil } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import SortableLib from "sortablejs";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { App, hasPermission, useLocalStorage, useSharedState } from "#context";
import { breakpoints } from "#lib/utils";

interface ContentPieceRowProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "order">;
}

declare module "#context" {
  interface SharedState {
    activeDraggablePiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "order"> | null;
  }
}

const ContentPieceRow: Component<ContentPieceRowProps> = (props) => {
  const { setStorage, storage } = useLocalStorage();
  const navigate = useNavigate();
  const createSharedSignal = useSharedState();
  const [, setActiveDraggablePiece] = createSharedSignal("activeDraggablePiece", null);
  const editedArticleId = (): string => storage().contentPieceId || "";

  return (
    <button
      class="w-full"
      onClick={() => {
        /* setStorage((storage) => ({
          ...storage,
          sidePanelView: "contentPiece",
          sidePanelWidth: storage.sidePanelWidth || 375,
          contentPieceId: props.contentPiece.id
        }));*/
      }}
    >
      <Card
        color="contrast"
        class="m-0 border-0 rounded-none justify-start items-center @hover:bg-gray-200 dark:@hover:bg-gray-700 @hover:cursor-pointer flex !bg-transparent p-0"
      >
        <div
          class="flex flex-1 justify-center items-center cursor-pointer overflow-hidden rounded-lg"
          ref={(el) => {
            SortableLib.create(el, {
              group: {
                name: "shared",
                put: () => false
              },
              delayOnTouchOnly: true,
              delay: 500,
              disabled: !hasPermission("manageDashboard"),
              ghostClass: "!hidden",
              revertOnSpill: true,
              filter: ".locked",

              onStart() {
                setActiveDraggablePiece(props.contentPiece);
              },
              onEnd() {
                setActiveDraggablePiece(null);
              }
            });
          }}
        >
          <div
            class="flex-1 flex justify-start items-center"
            data-content-piece-id={props.contentPiece.id}
          >
            <IconButton
              path={mdiFileDocumentOutline}
              class="m-0 ml-5 mr-1"
              variant="text"
              text="soft"
              hover={false}
              badge
            />
            <span class="clamp-1 text-start">{props.contentPiece.title}</span>
          </div>
        </div>
        <Show when={false}>
          <Tooltip text="Open in editor" side="left" wrapperClass="mr-4" class="-ml-1">
            <IconButton
              path={
                props.contentPiece.locked || !hasPermission("editMetadata") ? mdiEye : mdiPencil
              }
              text={editedArticleId() === props.contentPiece.id ? "base" : "soft"}
              color={editedArticleId() === props.contentPiece.id ? "primary" : "base"}
              variant="text"
              class="whitespace-nowrap contentPiece-card-edit m-0 @hover-dark:bg-gray-800"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setStorage((storage) => ({
                  ...storage,
                  sidePanelWidth: breakpoints.md() ? storage.sidePanelWidth || 375 : 0,
                  sidePanelView: "contentPiece",
                  contentPieceId: props.contentPiece.id
                }));
                navigate("/editor");
              }}
            />
          </Tooltip>
        </Show>
      </Card>
    </button>
  );
};

export { ContentPieceRow };
