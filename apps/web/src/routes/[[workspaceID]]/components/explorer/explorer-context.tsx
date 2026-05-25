import { createMemo, ParentComponent } from "solid-js";
import { useParams } from "@solidjs/router";
import { TreeProvider, useTree, type TreeMap } from "#web/components/tree";
import { getRequestEvent } from "solid-js/web";
import { useWorkspace } from "#web/context/workspace";

const EXPLORER_STATE_COOKIE = "explorer-state";

const readCookieValue = (cookieHeader: string, name: string) => {
  const prefix = `${name}=`;

  return cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length);
};

const parseExpandedCookie = (value: string | undefined | null) => {
  if (!value) {
    return {} as Record<string, string[]>;
  }

  try {
    const parsedValue = JSON.parse(decodeURIComponent(value));

    if (!parsedValue || typeof parsedValue !== "object") {
      return {} as Record<string, string[]>;
    }

    return Object.fromEntries(
      Object.entries(parsedValue).map(([workspaceID, expanded]) => [
        workspaceID,
        Array.isArray(expanded)
          ? expanded.filter((value): value is string => typeof value === "string")
          : []
      ])
    ) as Record<string, string[]>;
  } catch {
    return {} as Record<string, string[]>;
  }
};

const readExplorerStateCookie = () => {
  const event = getRequestEvent();

  if (event) {
    return parseExpandedCookie(
      readCookieValue(event.request.headers.get("cookie") || "", EXPLORER_STATE_COOKIE)
    );
  }

  if (typeof document === "undefined") {
    return {} as Record<string, string[]>;
  }

  const cookieValue = readCookieValue(document.cookie, EXPLORER_STATE_COOKIE);

  return parseExpandedCookie(cookieValue);
};

const ExplorerProvider: ParentComponent = (props) => {
  const { content } = useWorkspace();
  const params = useParams<{ workspaceID?: string }>();

  const tree = createMemo<TreeMap>(() => {
    // TODO: Finalize full contentTree retrieval
    const ct = {} as Record<string, { entries: string[]; collections: string[] }>;
    const result: TreeMap = {};

    for (const [key, value] of Object.entries(ct)) {
      result[key] = {
        items: value.entries,
        levels: value.collections
      };
    }

    return result;
  });
  const currentWorkspaceID = () => params.workspaceID || null;
  const expandedSourceKey = currentWorkspaceID;
  const initialExpanded = () => {
    const workspaceID = currentWorkspaceID();

    if (!workspaceID) {
      return [] as string[];
    }

    return readExplorerStateCookie()[workspaceID] ?? [];
  };
  const persistExpanded = (expanded: string[]) => {
    if (typeof document === "undefined") {
      return;
    }

    const workspaceID = currentWorkspaceID();

    if (!workspaceID) {
      return;
    }

    const nextExpandedState = readExplorerStateCookie();

    if (expanded.length > 0) {
      nextExpandedState[workspaceID] = expanded;
    } else {
      delete nextExpandedState[workspaceID];
    }

    document.cookie = `${EXPLORER_STATE_COOKIE}=${encodeURIComponent(
      JSON.stringify(nextExpandedState)
    )}; path=/; SameSite=Lax`;
  };

  return (
    <TreeProvider
      tree={tree}
      initialExpanded={initialExpanded}
      expandedSourceKey={expandedSourceKey}
      persistExpandedReady={() => !content.loading()}
      onExpandedChange={persistExpanded}
    >
      {props.children}
    </TreeProvider>
  );
};
const useExplorer = useTree;

export { ExplorerProvider, useExplorer };
