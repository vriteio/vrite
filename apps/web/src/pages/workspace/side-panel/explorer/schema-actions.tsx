import { useNavigate, useParams } from "@solidjs/router";
import { createMutation } from "@tanstack/solid-query";
import { createContext, type ParentComponent, createSignal, useContext } from "solid-js";
import { ActionConfirmationDialog } from "#web/components/action-confirmation-dialog";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";

interface SchemaRemovalTarget {
  collectionID: string;
  collectionName: string;
  schemaID: string;
}
interface SchemaActionsContextValue {
  remove(target: SchemaRemovalTarget): void;
}

const SchemaActionsContext = createContext<SchemaActionsContextValue>();
const SchemaActionsProvider: ParentComponent = (props) => {
  const navigate = useNavigate();
  const params = useParams<{ slug?: string; workspaceID?: string }>();
  const { content } = useWorkspace();
  const notify = useNotify();
  const [removal, setRemoval] = createSignal<SchemaRemovalTarget | null>(null);
  const removeMutation = createMutation(() => ({
    mutationFn: (target: SchemaRemovalTarget) => content.schemas.delete(target.schemaID),
    onSuccess: (result, target) => {
      setRemoval(null);

      if (params.slug === target.schemaID) {
        navigate(`/${params.workspaceID || ""}`);
      }

      if (!result.migrationID) notify({ type: "success", text: "Schema removed" });
    },
    onError: (error) => {
      console.error(error);
      notify({
        type: "error",
        text: error instanceof Error ? error.message : "Failed to remove schema"
      });
    }
  }));
  const remove = (target: SchemaRemovalTarget) => {
    if (!removeMutation.isPending && !content.hasActiveSchemaMigration(target.collectionID, true)) {
      setRemoval(target);
    }
  };
  const closeRemoval = () => {
    if (!removeMutation.isPending) setRemoval(null);
  };
  const affected = () => {
    const target = removal();

    if (!target) return [];

    return [
      {
        id: target.collectionID,
        icon: "i-tabler:pyramid-off",
        label: target.collectionName
      }
    ];
  };

  return (
    <SchemaActionsContext.Provider value={{ remove }}>
      {props.children}
      <ActionConfirmationDialog
        opened={Boolean(removal())}
        title="Remove schema?"
        description={
          <>
            If a parent schema becomes effective, entries in this collection tree will be converted
            to match it. Otherwise, schema enforcement will be disabled and entries will remain
            unchanged.
          </>
        }
        affected={affected()}
        warning="A migration can remove content. Removed content remains available through entry versions."
        action={{
          color: "danger",
          label: "Remove schema",
          loading: removeMutation.isPending,
          onClick: () => {
            const target = removal();

            if (target && !content.hasActiveSchemaMigration(target.collectionID, true)) {
              removeMutation.mutate(target);
            }
          }
        }}
        onClose={closeRemoval}
      />
    </SchemaActionsContext.Provider>
  );
};
const useSchemaActions = () => useContext(SchemaActionsContext)!;

export { SchemaActionsProvider, useSchemaActions };
export type { SchemaRemovalTarget };
