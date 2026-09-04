import { Title } from "@solidjs/meta";
import { type Component, Show } from "solid-js";
import { useParams, useSearchParams } from "@solidjs/router";
import { useWorkspace } from "#web/context/workspace";
import { SchemaEditorPane } from "./schema-editor-pane";
import { SchemaVersionPreviewPane } from "./version-preview-pane";

const SchemaPage: Component = () => {
  const params = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const { content, currentWorkspace } = useWorkspace();
  const schema = () => content.schemasCollection().findOne({ id: params.slug || "" });
  const collection = () => {
    const collectionID = schema()?.collectionID;

    return collectionID ? content.collections.get({ collectionID }) : null;
  };
  const title = () => {
    return `${collection()?.name ? `${collection()?.name} (Schema)` : currentWorkspace()?.name || "Workspace"} | Andesine`;
  };

  return (
    <>
      <Title>{title()}</Title>
      <Show when={typeof searchParams.version === "string"} fallback={<SchemaEditorPane />}>
        <SchemaVersionPreviewPane />
      </Show>
    </>
  );
};

export default SchemaPage;
