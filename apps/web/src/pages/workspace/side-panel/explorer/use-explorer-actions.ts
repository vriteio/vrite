import { useClipboard } from "#web/context/clipboard";
import { useNotify } from "#web/context/notifications";
import { useWorkspace } from "#web/context/workspace";
import { useTree } from "#web/components/tree";
import { useNavigate } from "@solidjs/router";

const useExplorerActions = () => {
  const notify = useNotify();
  const { copyText } = useClipboard();
  const navigate = useNavigate();
  const [{ focusedID, selection, flattenedOrder }, tree] = useTree();
  const { workspaceID, content } = useWorkspace();

  const getFocusedVisibleID = () => {
    const focused = focusedID();

    return focused && flattenedOrder().includes(focused) ? focused : null;
  };
  const getCommandTargetID = () => {
    const selected = selection();

    return selected.length ? (selected.length === 1 ? selected[0] : null) : getFocusedVisibleID();
  };
  const notifyReadOnly = () =>
    notify({ type: "error", text: "Explorer is read-only while offline" });
  const ensureWritable = () => {
    if (!content.readOnly()) return true;

    notifyReadOnly();
    return false;
  };
  const createEntry = (collectionID?: string) => {
    if (!ensureWritable()) return;

    tree.setRenaming(content.entries.create({ collectionID })?.id ?? "");
  };
  const createCollection = (collectionID?: string) => {
    if (!ensureWritable()) return;

    tree.setRenaming(content.collections.create({ parentID: collectionID })?.id ?? "");
  };
  const createForCommandTarget = (type: "entry" | "collection") => {
    if (!ensureWritable()) return true;

    const targetID = getCommandTargetID();
    if (!targetID || !content.collections.get({ collectionID: targetID })) return false;

    const created =
      type === "entry"
        ? content.entries.create({ collectionID: targetID })
        : content.collections.create({ parentID: targetID });

    tree.setExpanded((expanded) =>
      expanded.includes(targetID) ? expanded : [...expanded, targetID]
    );
    tree.setRenaming(created?.id ?? "");
    return true;
  };
  const deleteTarget = () => {
    const selected = selection();
    const focused = getFocusedVisibleID();
    const ids = selected.length ? selected : focused ? [focused] : [];

    if (!ids.length) return false;
    if (!ensureWritable()) return true;

    content.tree.delete({ ids });
    tree.setSelection([]);
    if (!selected.length) tree.setFocusedID(null);
    return true;
  };
  const renameTarget = () => {
    const targetID = getCommandTargetID();

    if (!targetID || content.readOnly()) return false;
    tree.setRenaming(targetID);
    return true;
  };
  const activateFocused = () => {
    const id = getFocusedVisibleID();

    if (!id) return false;
    tree.setExactSelection([]);
    if (content.collections.get({ collectionID: id })) {
      tree.toggleExpanded(id);
      return true;
    }
    if (!content.entries.get({ entryID: id })) return false;

    navigate(`/${workspaceID()}/${id}`);
    return true;
  };
  const copyTargetID = () => {
    const id = getCommandTargetID();

    if (!id) return false;
    void copyText(id, {
      success: "ID copied to clipboard",
      fallback: { title: "Copy ID manually" }
    });
    return true;
  };

  return {
    activateFocused,
    copyTargetID,
    createCollection,
    createEntry,
    createForCommandTarget,
    deleteTarget,
    getFocusedVisibleID,
    notifyReadOnly,
    renameTarget
  };
};

export { useExplorerActions };
