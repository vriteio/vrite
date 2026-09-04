import { useNavigate, useParams } from "@solidjs/router";
import { type Component, createMemo } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { CollaborativeEditorPane } from "../editor/collaborative-editor-pane";

const SchemaEditorPane: Component = () => {
  const params = useParams<{ slug?: string; workspaceID?: string }>();
  const navigate = useNavigate();
  const { content, currentSession, currentWorkspace } = useWorkspace();
  const selectedSchemaID = () => params.slug;
  const schema = createMemo(() => {
    const schemaID = selectedSchemaID();

    return schemaID ? content.schemasCollection().findOne({ id: schemaID }) : null;
  });
  const editable = () => {
    const collectionID = schema()?.collectionID;

    return Boolean(
      !content.offline() &&
      !content.syncing() &&
      collectionID &&
      !content.hasActiveSchemaMigration(collectionID, true) &&
      content.canCollection(collectionID, "collection:update")
    );
  };
  const collection = () => {
    const collectionID = schema()?.collectionID;

    return collectionID ? content.collections.get({ collectionID }) : null;
  };
  const title = () => `${collection()?.name || "Collection"} (schema)`;
  const workspaceID = () => params.workspaceID || currentWorkspace()?.id || "unknown";

  return (
    <CollaborativeEditorPane
      documentID={selectedSchemaID()}
      availableDocumentID={schema()?.id}
      editable={editable()}
      mode="schema"
      staticTitle={title()}
      loading={content.loading()}
      workspaceID={workspaceID()}
      user={currentSession()?.user}
      resourceLabel="schema"
      emptyIcon="i-tabler:pyramid-off"
      emptyMessage="Select a schema to start editing"
      notFoundIcon="i-tabler:pyramid-off"
      notFoundMessage="Schema not found"
      onBack={() => navigate(`/${workspaceID()}`)}
    />
  );
};

export { SchemaEditorPane };
