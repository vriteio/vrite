import { useParams, useSearchParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { useWorkspace } from "#web/context/workspace";
import { createSchemaDraftResponse, createSchemaVersionDetailsResponse } from "#web/lib/data";
import { VersionPreviewPane } from "../version-history/preview-pane";

const SchemaVersionPreviewPane: Component = () => {
  const params = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const { content } = useWorkspace();
  const schema = () => content.schemasCollection().findOne({ id: params.slug || "" });
  const collection = () => {
    const collectionID = schema()?.collectionID;

    return collectionID ? content.collections.get({ collectionID }) : null;
  };
  const collectionID = () => collection()?.id || "";
  const title = () => `${collection()?.name || "Collection"} (schema)`;
  const versionID = () => {
    return typeof searchParams.version === "string" ? searchParams.version : "";
  };
  const comparing = () => searchParams.compare === "current";
  const versionResponse = createSchemaVersionDetailsResponse(versionID);
  const draftResponse = createSchemaDraftResponse(() => (comparing() ? collectionID() : ""));
  const version = () => {
    const selectedVersion = versionResponse()?.result;

    return selectedVersion?.schemaID === params.slug ? selectedVersion : undefined;
  };
  const currentDocument = () => draftResponse()?.result?.local?.draftDocument || undefined;

  return (
    <VersionPreviewPane
      version={version}
      versionError={() => Boolean(versionResponse()?.error)}
      versionUnavailableDescription="This schema version could not be loaded or is no longer available."
      currentDocument={currentDocument}
      currentError={() => Boolean(draftResponse()?.error)}
      currentUnavailableDescription="The current schema draft could not be loaded."
      mode="schema"
      staticTitle={title()}
    />
  );
};

export { SchemaVersionPreviewPane };
