import { Button } from "@andesine/components";
import { createMutation } from "@tanstack/solid-query";
import { type Component, createSignal } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { client } from "#web/lib/api";
import { useSchemaMigration } from "./use-schema-migration";

interface SchemaApplicationProps {
  collectionID: string;
  collectionName: string;
  hasUnappliedChanges: boolean;
  schemaID: string;
}
const SchemaApplication: Component<SchemaApplicationProps> = (props) => {
  const workspace = useWorkspace();
  const notify = useNotify();
  const [confirmationOpened, setConfirmationOpened] = createSignal(false);
  const canApply = () => {
    return (
      props.hasUnappliedChanges &&
      !workspace.content.offline() &&
      !workspace.content.hasActiveSchemaMigration(props.collectionID, true) &&
      workspace.content.canCollection(props.collectionID, "collection:update")
    );
  };
  const refreshAppliedSchema = () => {
    void workspace.content.syncWorkspaceContent(workspace.workspaceID()).catch((error) => {
      console.error("Failed to refresh applied schema", error);
    });
  };
  const schemaMigration = useSchemaMigration({
    collectionID: () => props.collectionID,
    onCompleted: refreshAppliedSchema
  });
  const applyMutation = createMutation(() => ({
    mutationFn: () => {
      return client.schemas.apply({
        confirmedDataLoss: true,
        schemaID: props.schemaID
      });
    },
    onSuccess: (result) => {
      setConfirmationOpened(false);

      if (!result.changed || !result.migrationID) {
        refreshAppliedSchema();
        notify({ type: "success", text: "Schema is already applied" });
        return;
      }

      schemaMigration.start({
        migrationID: result.migrationID,
        totalEntries: result.totalEntries
      });
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to apply schema"
      });
    }
  }));
  const closeConfirmation = () => {
    if (applyMutation.isPending) return;

    setConfirmationOpened(false);
  };

  return (
    <>
      <Button
        color="primary"
        variant="outlined"
        size="small"
        disabled={!canApply()}
        title={
          workspace.content.offline()
            ? "Schema application is unavailable while offline"
            : workspace.content.hasActiveSchemaMigration(props.collectionID, true)
              ? "Schema migration in progress"
              : !props.hasUnappliedChanges
                ? "Schema has no unapplied changes"
                : undefined
        }
        onClick={() => setConfirmationOpened(true)}
      >
        <span class="i-tabler:pyramid-plus h-4 w-4" />
        Save &amp; apply
      </Button>
      <ActionConfirmationDialog
        opened={confirmationOpened()}
        title="Save and apply schema?"
        description={
          <>
            The schema will become active for this collection and its affected subcollections.
            Existing entries will be converted to match it.
          </>
        }
        affected={[
          {
            id: props.collectionID,
            icon: "i-tabler:pyramid",
            label: props.collectionName
          }
        ]}
        warning="This migration can remove content. Removed content remains available through entry versions."
        action={{
          color: "primary",
          label: "Save & apply",
          loading: applyMutation.isPending,
          onClick: () => {
            if (canApply()) applyMutation.mutate();
          }
        }}
        onClose={closeConfirmation}
      />
    </>
  );
};

export { SchemaApplication };
