import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import { ySyncPluginKey } from "@tiptap/y-tiptap";
import type { EditorMode } from "#editor/client-types";
import { FRAGMENT_BLOCK_TYPES, type FragmentBlockType } from "#editor/schema/fragment";
import { isPositionInInheritedField, rangeContainsInheritedField } from "#editor/ui/block-utils";

interface SchemaConstraintsOptions {
  mode: EditorMode;
}
interface RootInspection {
  hasSchemaFields: boolean;
  invalidBlocks: number;
}

const isSchemaField = (node: ProseMirrorNode): boolean => {
  return node.type.name === "fragment" || node.type.name === "property";
};
const getFieldStructure = (document: ProseMirrorNode): string => {
  const fields: unknown[] = [];

  document.forEach((node) => {
    if (!isSchemaField(node)) return;

    fields.push({
      kind: node.type.name,
      schemaFieldID: node.attrs.schemaFieldID,
      label: node.attrs.label,
      type: node.attrs.type,
      options: node.attrs.options,
      name: node.attrs.name,
      allowedBlocks: node.attrs.allowedBlocks
    });
  });

  return JSON.stringify(fields);
};
const inspectRoot = (document: ProseMirrorNode, mode: EditorMode): RootInspection => {
  let hasSchemaFields = false;
  let invalidBlocks = 0;

  for (let index = 0; index < document.childCount; index += 1) {
    const node = document.child(index);
    const schemaField = isSchemaField(node);
    const isEntryTitle = mode === "entry" && index === 0 && node.type.name === "title";
    const isSchemaTrailingParagraph =
      mode === "schema" &&
      index === document.childCount - 1 &&
      node.type.name === "paragraph" &&
      (!node.textContent || node.textContent.startsWith("/"));

    if (schemaField && typeof node.attrs.schemaFieldID === "string") {
      hasSchemaFields = true;
    }

    if (!isEntryTitle && !schemaField && !isSchemaTrailingParagraph) invalidBlocks += 1;
  }

  return { hasSchemaFields, invalidBlocks };
};
const hasValidFragmentBlocks = (document: ProseMirrorNode): boolean => {
  for (let index = 0; index < document.childCount; index += 1) {
    const node = document.child(index);

    if (node.type.name !== "fragment") continue;

    const allowedBlocks: readonly FragmentBlockType[] = Array.isArray(node.attrs.allowedBlocks)
      ? (node.attrs.allowedBlocks as FragmentBlockType[])
      : FRAGMENT_BLOCK_TYPES;

    for (let childIndex = 0; childIndex < node.childCount; childIndex += 1) {
      const child = node.child(childIndex);

      if (!allowedBlocks.includes(child.type.name as FragmentBlockType)) return false;
    }
  }

  return true;
};
const SchemaConstraints = Extension.create<SchemaConstraintsOptions>({
  name: "schemaConstraints",
  addOptions() {
    return { mode: "schema" };
  },
  addProseMirrorPlugins() {
    const mode = this.options.mode;

    return [
      new Plugin({
        filterTransaction(transaction, state) {
          if (mode === "schema" && transaction.selectionSet) {
            const { selection } = transaction;
            const selectsInheritedField = selection.empty
              ? isPositionInInheritedField(transaction.doc, selection.from)
              : rangeContainsInheritedField(transaction.doc, selection.from, selection.to);

            if (selectsInheritedField) return false;
          }

          if (!transaction.docChanged) return true;

          const currentRoot = inspectRoot(state.doc, mode);
          const nextRoot = inspectRoot(transaction.doc, mode);
          const schemaControlled =
            mode === "schema" || currentRoot.hasSchemaFields || nextRoot.hasSchemaFields;

          if (!schemaControlled) return true;

          const changesEntryStructure =
            mode === "entry" &&
            currentRoot.hasSchemaFields &&
            !transaction.getMeta(ySyncPluginKey) &&
            getFieldStructure(state.doc) !== getFieldStructure(transaction.doc);

          if (changesEntryStructure) return false;

          const addsInvalidRootBlock = nextRoot.invalidBlocks > currentRoot.invalidBlocks;

          return !addsInvalidRootBlock && hasValidFragmentBlocks(transaction.doc);
        }
      })
    ];
  }
});

export { SchemaConstraints };
