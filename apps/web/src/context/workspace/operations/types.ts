import { type Collection as LocalDBCollection } from "@signaldb/core";
import { type Collection, type Entry } from "#web/lib/api";
import { type Accessor } from "solid-js";

interface WorkspaceContentOperationsInput {
  entriesCollection: Accessor<LocalDBCollection<Entry>>;
  collectionsCollection: Accessor<LocalDBCollection<Collection>>;
}

interface ContentTreeLevel {
  items: string[];
  levels: string[];
}

type ContentTree = Record<string, ContentTreeLevel>;

const ROOT_COLLECTION_NAME = "~";

export { ROOT_COLLECTION_NAME };
export type { ContentTree, ContentTreeLevel, WorkspaceContentOperationsInput };
