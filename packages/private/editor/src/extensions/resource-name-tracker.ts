import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { normalizeResourceName } from "#editor/lib";

interface ResourceNameDetails {
  name: string;
  warning?: string;
}
interface ResourceNameRecord {
  name: string;
  sourceName: string;
}
interface ResourceNamesState {
  fragment: Map<number, ResourceNameRecord>;
  property: Map<number, ResourceNameRecord>;
}

type ResourceType = "fragment" | "property";

const resourceNameTrackerPluginKey = new PluginKey<ResourceNamesState>("resourceNameTracker");
const RESOURCE_DETAILS: Record<ResourceType, { attribute: "label" | "name"; fallback: string }> = {
  fragment: { attribute: "name", fallback: "content" },
  property: { attribute: "label", fallback: "property" }
};
const getUniqueResourceName = (names: Set<string>, name: string): string => {
  let uniqueName = name;
  let suffix = 1;

  while (names.has(uniqueName)) {
    suffix += 1;
    uniqueName = `${name}${suffix}`;
  }

  return uniqueName;
};
const getNodeSourceName = (node: ProseMirrorNode, type: ResourceType): string => {
  return String(node.attrs[RESOURCE_DETAILS[type].attribute] || "");
};
const createResourceNamesState = (doc: ProseMirrorNode): ResourceNamesState => {
  const state: ResourceNamesState = {
    fragment: new Map(),
    property: new Map()
  };
  const usedNames: Record<ResourceType, Set<string>> = {
    fragment: new Set(),
    property: new Set()
  };

  doc.forEach((node, pos) => {
    const type = node.type.name as ResourceType;
    const details = RESOURCE_DETAILS[type];

    if (!details) return;

    const sourceName = getNodeSourceName(node, type);
    const normalizedName = normalizeResourceName(sourceName, details.fallback);
    const name = getUniqueResourceName(usedNames[type], normalizedName);

    usedNames[type].add(name);
    state[type].set(pos, { name, sourceName });
  });

  return state;
};
const getResourceNameDetails = (
  state: EditorState,
  type: ResourceType,
  pos: number | undefined,
  sourceName: string
): ResourceNameDetails => {
  const details = RESOURCE_DETAILS[type];
  const resourceNames =
    resourceNameTrackerPluginKey.getState(state)?.[type] ??
    createResourceNamesState(state.doc)[type];
  const trackedResource = typeof pos === "number" ? resourceNames.get(pos) : null;
  const normalizedName = normalizeResourceName(sourceName, details.fallback);
  const usedNames = new Set<string>();

  if (
    trackedResource &&
    trackedResource.sourceName === sourceName &&
    trackedResource.name === normalizedName
  ) {
    return { name: trackedResource.name };
  }

  resourceNames.forEach((resource, resourcePos) => {
    if (typeof pos !== "number" || resourcePos < pos) usedNames.add(resource.name);
  });

  const name = getUniqueResourceName(usedNames, normalizedName);

  return {
    name,
    warning:
      name !== normalizedName
        ? `The name "${sourceName}" is already in use. For API access, this ${type} will be available as "${name}".`
        : undefined
  };
};
const ResourceNameTracker = Extension.create({
  name: "resourceNameTracker",
  addProseMirrorPlugins() {
    return [
      new Plugin<ResourceNamesState>({
        key: resourceNameTrackerPluginKey,
        state: {
          init: (_, state) => createResourceNamesState(state.doc),
          apply(transaction, value) {
            return transaction.docChanged ? createResourceNamesState(transaction.doc) : value;
          }
        }
      })
    ];
  }
});

export { ResourceNameTracker, getResourceNameDetails };
export type { ResourceNameDetails, ResourceType };
