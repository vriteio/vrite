import { useTree } from "#web/components/tree";
import { useWorkspace } from "#web/context/workspace";
import { createRef, useShortcuts } from "@andesine/components";
import { onCleanup, onMount } from "solid-js";
import { useExplorerActions } from "./use-explorer-actions";

interface ExplorerKeyboardInput {
  active(): boolean;
  scrollItemIntoView(id: string): void;
}

const isEditingText = () => {
  const element = document.activeElement;

  return (
    element instanceof HTMLElement &&
    Boolean(element.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"))
  );
};

const useExplorerKeyboard = (input: ExplorerKeyboardInput) => {
  const registerShortcuts = useShortcuts();
  const [{ focusedID, selection, flattenedOrder, isExpanded }, tree] = useTree();
  const { content } = useWorkspace();
  const actions = useExplorerActions();
  const [rangeAnchor, setRangeAnchor] = createRef<string | null>(null);
  const [rangeHead, setRangeHead] = createRef<string | null>(null);
  const [typeaheadQuery, setTypeaheadQuery] = createRef("");
  const [typeaheadTimeout, setTypeaheadTimeout] = createRef(0);
  const resetRange = () => {
    setRangeAnchor(null);
    setRangeHead(null);
  };
  const focusItem = (id: string, scroll = false) => {
    tree.setFocusedItem(id, "keyboard");
    if (scroll) queueMicrotask(() => input.scrollItemIntoView(id));
  };
  const focusSingleItem = (id: string, scroll = false) => {
    tree.setExactSelection([]);
    resetRange();
    focusItem(id, scroll);
  };
  const navigate = (direction: "up" | "down") => {
    const ids = flattenedOrder();
    if (!ids.length) return false;

    const current = actions.getFocusedVisibleID();
    const index = current ? ids.indexOf(current) : -1;
    const next =
      index === -1
        ? direction === "down"
          ? 0
          : ids.length - 1
        : (index + (direction === "down" ? 1 : -1) + ids.length) % ids.length;

    focusSingleItem(ids[next], true);
    return true;
  };
  const navigateHierarchy = (direction: "left" | "right") => {
    const id = actions.getFocusedVisibleID();
    if (!id) return false;

    const collection = content.collections.get({ collectionID: id });
    if (direction === "right") {
      if (!collection) return false;
      if (!isExpanded(id)) {
        tree.setExactSelection([]);
        tree.toggleExpanded(id);
        return true;
      }

      const level = content.tree.getLevel({ parentID: id });
      const child = level.collections()[0]?.id ?? level.entries()[0]?.id;
      if (child) focusSingleItem(child, true);
      return true;
    }
    if (collection && isExpanded(id)) {
      tree.setExactSelection([]);
      tree.toggleExpanded(id);
      return true;
    }

    const parent =
      collection?.ancestors.at(-1) ?? content.entries.get({ entryID: id })?.collectionID;
    if (parent) focusSingleItem(parent, true);
    return Boolean(parent);
  };
  const toggleSelection = () => {
    const id = actions.getFocusedVisibleID();
    if (!id) return false;

    tree.setExactSelection(
      selection().includes(id) ? selection().filter((item) => item !== id) : [...selection(), id]
    );
    resetRange();
    return true;
  };
  const selectAll = () => {
    const ids = flattenedOrder();
    if (!ids.length) return false;

    tree.setExactSelection(ids);
    resetRange();
    return true;
  };
  const extendSelection = (direction: "up" | "down") => {
    const ids = flattenedOrder();
    const current = actions.getFocusedVisibleID();
    const focusedIndex = current ? ids.indexOf(current) : -1;
    if (!current || focusedIndex === -1) return navigate(direction);

    const anchorIndex = rangeAnchor() ? ids.indexOf(rangeAnchor()!) : -1;
    const headIndex = rangeHead() ? ids.indexOf(rangeHead()!) : -1;
    const continuing = anchorIndex !== -1 && headIndex !== -1 && rangeHead() === current;
    if (!continuing) {
      tree.setExactSelection([current]);
      setRangeAnchor(current);
      setRangeHead(current);
      return true;
    }

    const nextIndex = Math.min(
      ids.length - 1,
      Math.max(0, headIndex + (direction === "down" ? 1 : -1))
    );
    if (nextIndex === headIndex) return true;
    focusItem(ids[nextIndex], true);
    if (nextIndex === anchorIndex) {
      tree.setExactSelection([]);
      resetRange();
      return true;
    }

    setRangeHead(ids[nextIndex]);
    tree.setExactSelection(
      ids.slice(Math.min(anchorIndex, nextIndex), Math.max(anchorIndex, nextIndex) + 1)
    );
    return true;
  };
  const typeahead = (event: KeyboardEvent) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.key.length !== 1 ||
      !event.key.trim()
    )
      return false;

    window.clearTimeout(typeaheadTimeout());
    const ids = flattenedOrder();
    if (!ids.length) return false;

    const character = event.key.toLocaleLowerCase();
    let query = `${typeaheadQuery()}${character}`;
    const index = focusedID() ? ids.indexOf(focusedID()!) : -1;
    const candidates = [...ids.slice(index + 1), ...ids.slice(0, index + 1)];
    const label = (id: string) =>
      (
        content.collections.get({ collectionID: id })?.name ??
        content.entries.get({ entryID: id })?.name ??
        ""
      ).toLocaleLowerCase();
    let match = candidates.find((id) => label(id).startsWith(query));
    if (!match && query.length > 1) {
      query = character;
      match = candidates.find((id) => label(id).startsWith(query));
    }

    setTypeaheadQuery(query);
    setTypeaheadTimeout(window.setTimeout(() => setTypeaheadQuery(""), 700));
    if (match) focusSingleItem(match, true);
    return Boolean(match);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (!input.active() || isEditingText()) return;
    const handled = (() => {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        const direction = event.key === "ArrowDown" ? "down" : "up";
        return event.shiftKey ? extendSelection(direction) : navigate(direction);
      }
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        return navigateHierarchy(event.key === "ArrowLeft" ? "left" : "right");
      }
      if (event.key === " ") return toggleSelection();
      if (event.key === "Enter") return actions.activateFocused();
      if (event.key === "F2") return actions.renameTarget();
      if (event.key === "Escape" && selection().length) {
        tree.setExactSelection([]);
        resetRange();
        return true;
      }
      return typeahead(event);
    })();

    if (handled) event.preventDefault();
  };

  onMount(() => {
    document.body.addEventListener("keydown", onKeyDown);
    const canHandle = () => input.active() && !isEditingText();
    const unregister = registerShortcuts({
      "$mod+E": () => (canHandle() ? (actions.createEntry(), true) : false),
      "$mod+shift+E": () => (canHandle() ? (actions.createCollection(), true) : false),
      "$mod+n": () => (canHandle() ? actions.createForCommandTarget("entry") : false),
      "$mod+shift+n": () => (canHandle() ? actions.createForCommandTarget("collection") : false),
      "$mod+a": () => (canHandle() ? selectAll() : false),
      "$mod+Alt+KeyC": () => (canHandle() ? actions.copyTargetID() : false),
      "$mod+backspace": () => (canHandle() ? actions.deleteTarget() : false),
      "delete": () => (canHandle() ? actions.deleteTarget() : false)
    });

    onCleanup(() => {
      document.body.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(typeaheadTimeout());
      unregister();
    });
  });

  return { resetRange };
};

export { useExplorerKeyboard };
