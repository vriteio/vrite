import { Component } from "solid-js";
import { mdiEye, mdiFileOutline, mdiPencil } from "@mdi/js";
import { useNavigate } from "@solidjs/router";
import { Card, IconButton, Tooltip } from "#components/primitives";
import { App, hasPermission, useLocalStorage } from "#context";
import { breakpoints } from "#lib/utils";

interface ContentPieceRowProps {
  contentPiece: App.ExtendedContentPieceWithAdditionalData<"locked" | "order">;
}

const ContentPieceRow: Component<ContentPieceRowProps> = (props) => {
  const { setStorage, storage } = useLocalStorage();
  const navigate = useNavigate();
  const editedArticleId = (): string => storage().contentPieceId || "";

  return (
    <button
      onClick={() => {
        setStorage((storage) => ({
          ...storage,
          sidePanelView: "contentPiece",
          sidePanelWidth: storage.sidePanelWidth || 375,
          contentPieceId: props.contentPiece.id
        }));
      }}
    >
      <Card
        color="contrast"
        class="m-0 border-x-0 border-t-0 rounded-none justify-start items-center hover:bg-gray-200 dark:hover:bg-gray-700 hover:cursor-pointer pl-4 flex bg-transparent"
      >
        <div class="flex-1 flex justify-start items-center">
          <IconButton
            path={mdiFileOutline}
            class="m-0 mr-1"
            variant="text"
            text="soft"
            hover={false}
            badge
          />
          {props.contentPiece.title}
        </div>
        <Tooltip text="Open in editor" side="left" wrapperClass="mr-4" class="-ml-1">
          <IconButton
            path={props.contentPiece.locked || !hasPermission("editMetadata") ? mdiEye : mdiPencil}
            text={editedArticleId() === props.contentPiece.id ? "base" : "soft"}
            color={editedArticleId() === props.contentPiece.id ? "primary" : "base"}
            variant="text"
            class="whitespace-nowrap contentPiece-card-edit m-0"
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
      </Card>
    </button>
  );
};

export { ContentPieceRow };
