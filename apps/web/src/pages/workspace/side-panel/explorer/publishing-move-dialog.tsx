import { type Component } from "solid-js";
import {
  ActionConfirmationDialog,
  type AffectedItem
} from "#web/components/action-confirmation-dialog";

interface PendingPublishingMove {
  affected: AffectedItem[];
  direction: "enter" | "leave";
  execute(publish?: boolean): void;
}
interface PublishingMoveDialogProps {
  move: PendingPublishingMove | null;
  onClose(): void;
  onConfirm(publish?: boolean): void;
}

const PublishingMoveDialog: Component<PublishingMoveDialogProps> = (props) => {
  const entering = () => props.move?.direction === "enter";

  return (
    <ActionConfirmationDialog
      opened={Boolean(props.move)}
      title={entering() ? "Move into publishing?" : "Move out of publishing?"}
      description={
        entering()
          ? "Choose whether to publish the current content after moving it into this publishing-enabled group."
          : "All channel assignments will be removed for content that is no longer in a publishing-enabled group."
      }
      affected={props.move?.affected ?? []}
      action={{
        color: "primary",
        icon: entering()
          ? "i-material-symbols:publish-rounded"
          : "i-material-symbols:drive-file-move-outline-rounded",
        label: entering() ? "Move and publish" : "Move and unpublish",
        onClick: () => props.onConfirm(entering() ? true : undefined)
      }}
      secondaryAction={
        entering()
          ? {
              icon: "i-material-symbols:drive-file-move-outline-rounded",
              label: "Move only",
              onClick: () => props.onConfirm(false)
            }
          : undefined
      }
      onClose={props.onClose}
    />
  );
};

export { PublishingMoveDialog };
export type { PendingPublishingMove };
