import { useParams, useSearchParams } from "@solidjs/router";
import type { Component } from "solid-js";
import { createEntryDraftResponse, createVersionDetailsResponse } from "#web/lib/data";
import { VersionPreviewPane as SharedVersionPreviewPane } from "../version-history/preview-pane";

const VersionPreviewPane: Component = () => {
  const params = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const versionID = () => {
    return typeof searchParams.version === "string" ? searchParams.version : "";
  };
  const comparing = () => searchParams.compare === "current";
  const versionResponse = createVersionDetailsResponse(versionID);
  const draftResponse = createEntryDraftResponse(() => (comparing() ? params.slug || "" : ""));
  const version = () => {
    const selectedVersion = versionResponse()?.result;

    return selectedVersion?.entryID === params.slug ? selectedVersion : undefined;
  };
  const currentDocument = () => {
    const draft = draftResponse()?.result;

    return draft && draft.id === params.slug ? draft.content : undefined;
  };

  return (
    <SharedVersionPreviewPane
      version={version}
      versionError={() => Boolean(versionResponse()?.error)}
      versionUnavailableDescription="This version could not be loaded or is no longer available."
      currentDocument={currentDocument}
      currentError={() => Boolean(draftResponse()?.error)}
      currentUnavailableDescription="The current document could not be loaded."
    />
  );
};

export { VersionPreviewPane };
