import { type Component } from "solid-js";
import {
  ActionConfirmationDialog,
  type AffectedItem
} from "#web/components/action-confirmation-dialog";
import { useWorkspace } from "#web/context/workspace";

interface ExplorerMoveDialogInput {
  collectionIDs: string[];
  entryIDs: string[];
}
interface ExplorerMoveDialogsProps {
  confirming: boolean;
  move: ExplorerMoveDialogInput | null;
  onCancel(): void;
  onConfirm(): void;
}

const ExplorerMoveDialogs: Component<ExplorerMoveDialogsProps> = (props) => {
  const { content } = useWorkspace();
  const affectedItems = (): AffectedItem[] => {
    if (!props.move) return [];

    return [
      ...props.move.collectionIDs.flatMap((id) => {
        const collection = content.collections.get({ collectionID: id });

        return collection
          ? [{ id, icon: "i-lucide:folder", label: collection.name } satisfies AffectedItem]
          : [];
      }),
      ...props.move.entryIDs.flatMap((id) => {
        const entry = content.entries.get({ entryID: id });

        return entry
          ? [{ id, icon: "i-lucide:file-text", label: entry.name } satisfies AffectedItem]
          : [];
      })
    ];
  };

  return (
    <ActionConfirmationDialog
      opened={Boolean(props.move)}
      title="Move and convert content?"
      description={
        <>
          The destination schema will be applied to the moved content. The move can remove content
          that the schema does not support.
        </>
      }
      affected={affectedItems()}
      warning="Removed content remains available through entry versions."
      action={{
        color: "primary",
        label: "Move & apply schema",
        loading: props.confirming,
        onClick: props.onConfirm
      }}
      onClose={props.onCancel}
    />
  );
};

export { ExplorerMoveDialogs };
export type { ExplorerMoveDialogInput };
